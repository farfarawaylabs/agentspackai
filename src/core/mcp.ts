import { lstat, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { AgentsPackError } from "./errors.ts";
import type { CommandRunner, ProcessResult } from "./process.ts";

export const MCP_AGENTS = ["claude", "codex", "cursor"] as const;
export type McpAgent = (typeof MCP_AGENTS)[number];

export interface ManagedMcpServer {
	url: string;
	targets: McpAgent[];
	addedAt: string;
}

export interface McpState {
	schemaVersion: 1;
	servers: Record<string, ManagedMcpServer>;
}

export interface McpPaths {
	userHome: string;
	stateDirectory: string;
	statePath: string;
	transactionsDirectory: string;
	codexConfigPath: string;
	claudeConfigPath: string;
	cursorConfigPath: string;
}

export type ProviderInspection =
	| { agent: McpAgent; status: "present"; url: string }
	| { agent: McpAgent; status: "missing" }
	| { agent: McpAgent; status: "unavailable"; detail: string }
	| { agent: McpAgent; status: "malformed"; detail: string };

export function resolveMcpPaths(
	userHome: string,
	env: Readonly<Record<string, string | undefined>> = process.env,
): McpPaths {
	const home = resolve(userHome);
	const stateDirectory = join(home, ".agents-pack");
	const codexHome = resolve(env.CODEX_HOME ?? join(home, ".codex"));
	const claudeHome = env.CLAUDE_CONFIG_DIR;

	return {
		userHome: home,
		stateDirectory,
		statePath: join(stateDirectory, "mcp-lock.json"),
		transactionsDirectory: join(stateDirectory, "mcp-transactions"),
		codexConfigPath: join(codexHome, "config.toml"),
		claudeConfigPath:
			claudeHome === undefined
				? join(home, ".claude.json")
				: join(resolve(claudeHome), ".claude.json"),
		cursorConfigPath: join(home, ".cursor", "mcp.json"),
	};
}

export function validateMcpName(name: string): string {
	if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name)) {
		throw new AgentsPackError(
			"USAGE",
			"MCP server names must start with a letter or number and contain only letters, numbers, underscores, or hyphens.",
			{ exitCode: 2 },
		);
	}

	return name;
}

export function validateRemoteMcpUrl(value: string): string {
	let url: URL;

	try {
		url = new URL(value);
	} catch (cause) {
		throw new AgentsPackError("USAGE", "--url must be a valid URL.", {
			cause,
			exitCode: 2,
		});
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new AgentsPackError(
			"USAGE",
			"--url must use http or https for a remote MCP server.",
			{ exitCode: 2 },
		);
	}

	if (url.username.length > 0 || url.password.length > 0) {
		throw new AgentsPackError(
			"USAGE",
			"--url must not contain credentials. Configure authentication with each provider.",
			{ exitCode: 2 },
		);
	}

	if (url.hash.length > 0) {
		throw new AgentsPackError("USAGE", "--url must not contain a fragment.", {
			exitCode: 2,
		});
	}

	return url.href;
}

export async function loadMcpState(path: string): Promise<McpState> {
	const source = await readOptionalFile(path);

	if (source === undefined) {
		return { schemaVersion: 1, servers: {} };
	}

	let value: unknown;

	try {
		value = JSON.parse(source);
	} catch (cause) {
		throw malformedState(path, cause);
	}

	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw malformedState(path);
	}

	const record = value as Record<string, unknown>;

	if (
		record.schemaVersion !== 1 ||
		typeof record.servers !== "object" ||
		record.servers === null ||
		Array.isArray(record.servers)
	) {
		throw malformedState(path);
	}

	const servers: Record<string, ManagedMcpServer> = {};

	for (const [name, serverValue] of Object.entries(record.servers)) {
		if (
			typeof serverValue !== "object" ||
			serverValue === null ||
			Array.isArray(serverValue)
		) {
			throw malformedState(path);
		}

		const server = serverValue as Record<string, unknown>;

		if (
			typeof server.url !== "string" ||
			typeof server.addedAt !== "string" ||
			Number.isNaN(Date.parse(server.addedAt)) ||
			!Array.isArray(server.targets) ||
			server.targets.length === 0 ||
			server.targets.some((target) => !isMcpAgent(target)) ||
			new Set(server.targets).size !== server.targets.length
		) {
			throw malformedState(path);
		}

		if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name)) {
			throw malformedState(path);
		}

		let normalizedUrl: string;

		try {
			normalizedUrl = validateRemoteMcpUrl(server.url);
		} catch {
			throw malformedState(path);
		}

		servers[name] = {
			url: normalizedUrl,
			targets: [...server.targets] as McpAgent[],
			addedAt: server.addedAt,
		};
	}

	return { schemaVersion: 1, servers };
}

export function serializeMcpState(state: McpState): Uint8Array {
	const sortedServers = Object.fromEntries(
		Object.entries(state.servers)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([name, server]) => [
				name,
				{ ...server, targets: [...server.targets].sort() },
			]),
	);

	return Buffer.from(
		`${JSON.stringify({ schemaVersion: 1, servers: sortedServers }, null, 2)}\n`,
	);
}

export async function inspectMcpProvider(
	agent: McpAgent,
	name: string,
	paths: McpPaths,
	runner: CommandRunner,
	env?: Readonly<Record<string, string | undefined>>,
): Promise<ProviderInspection> {
	if (agent === "codex") {
		return inspectCodex(name, runner, env);
	}

	const path =
		agent === "claude" ? paths.claudeConfigPath : paths.cursorConfigPath;
	const config = await readProviderJson(path, agent);

	if ("inspection" in config) {
		return config.inspection;
	}

	const entry = config.value.mcpServers?.[name];

	if (entry === undefined) {
		return { agent, status: "missing" };
	}

	if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
		return {
			agent,
			status: "malformed",
			detail: `${path} has an invalid ${name} entry.`,
		};
	}

	const url = (entry as Record<string, unknown>).url;

	if (typeof url !== "string") {
		return {
			agent,
			status: "malformed",
			detail: `${path} has an MCP entry without a URL for ${name}.`,
		};
	}

	return { agent, status: "present", url };
}

export async function updateCursorConfig(
	path: string,
	name: string,
	url: string | undefined,
): Promise<Uint8Array> {
	const config = await readProviderJson(path, "cursor");

	if ("inspection" in config) {
		throw new AgentsPackError("MALFORMED_STATE", config.inspection.detail);
	}

	const mcpServers = { ...(config.value.mcpServers ?? {}) };

	if (url === undefined) {
		delete mcpServers[name];
	} else {
		mcpServers[name] = { url };
	}

	return Buffer.from(
		`${JSON.stringify({ ...config.value.root, mcpServers }, null, 2)}\n`,
	);
}

export async function assertRegularOrMissing(path: string): Promise<void> {
	const info = await lstat(path).catch((error: unknown) => {
		if (hasCode(error, "ENOENT")) {
			return undefined;
		}
		throw error;
	});

	if (info !== undefined && !info.isFile()) {
		throw new AgentsPackError(
			"OWNERSHIP_CONFLICT",
			`MCP configuration path must be a regular file: ${path}`,
		);
	}
}

async function inspectCodex(
	name: string,
	runner: CommandRunner,
	env?: Readonly<Record<string, string | undefined>>,
): Promise<ProviderInspection> {
	if (!runner.isAvailable("codex")) {
		return {
			agent: "codex",
			status: "unavailable",
			detail: "codex is not installed or is not on PATH.",
		};
	}

	let result: ProcessResult;

	try {
		result = await runner.run("codex", ["mcp", "get", name], env);
	} catch (error) {
		return {
			agent: "codex",
			status: "unavailable",
			detail: error instanceof Error ? error.message : "codex mcp get failed.",
		};
	}
	const combined = `${result.stdout}\n${result.stderr}`;

	if (result.exitCode !== 0) {
		if (/No MCP server named/i.test(combined)) {
			return { agent: "codex", status: "missing" };
		}

		return {
			agent: "codex",
			status: "unavailable",
			detail: combined.trim() || "codex mcp get failed.",
		};
	}

	const match = combined.match(/^\s*url:\s*(.+?)\s*$/m);

	if (match?.[1] === undefined) {
		return {
			agent: "codex",
			status: "malformed",
			detail: "codex mcp get did not report a remote URL.",
		};
	}

	return { agent: "codex", status: "present", url: match[1] };
}

interface ProviderJson {
	root: Record<string, unknown>;
	mcpServers?: Record<string, unknown>;
}

async function readProviderJson(
	path: string,
	agent: "claude" | "cursor",
): Promise<
	| { value: ProviderJson }
	| { inspection: Extract<ProviderInspection, { status: "malformed" }> }
> {
	const source = await readOptionalFile(path);

	if (source === undefined) {
		return { value: { root: {} } };
	}

	let value: unknown;

	try {
		value = JSON.parse(source);
	} catch {
		return {
			inspection: {
				agent,
				status: "malformed",
				detail: `${path} is not valid JSON.`,
			},
		};
	}

	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return {
			inspection: {
				agent,
				status: "malformed",
				detail: `${path} must contain a JSON object.`,
			},
		};
	}

	const root = value as Record<string, unknown>;
	const servers = root.mcpServers;

	if (
		servers !== undefined &&
		(typeof servers !== "object" || servers === null || Array.isArray(servers))
	) {
		return {
			inspection: {
				agent,
				status: "malformed",
				detail: `${path} has an invalid mcpServers value.`,
			},
		};
	}

	return {
		value: {
			root,
			...(servers === undefined
				? {}
				: { mcpServers: servers as Record<string, unknown> }),
		},
	};
}

async function readOptionalFile(path: string): Promise<string | undefined> {
	try {
		return await readFile(path, "utf8");
	} catch (error) {
		if (hasCode(error, "ENOENT")) {
			return undefined;
		}
		throw error;
	}
}

function malformedState(path: string, cause?: unknown): AgentsPackError {
	return new AgentsPackError(
		"MALFORMED_STATE",
		`Managed MCP state is malformed: ${path}`,
		{ cause },
	);
}

function isMcpAgent(value: unknown): value is McpAgent {
	return value === "claude" || value === "codex" || value === "cursor";
}

function hasCode(error: unknown, code: string): boolean {
	return (
		error instanceof Error &&
		"code" in error &&
		(error as NodeJS.ErrnoException).code === code
	);
}
