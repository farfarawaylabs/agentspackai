import { homedir } from "node:os";
import { lstat, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseMcpArguments } from "../cli/arguments.ts";
import { confirmApply } from "../cli/prompts.ts";
import { AgentsPackError } from "../core/errors.ts";
import {
	MCP_AGENTS,
	assertRegularOrMissing,
	inspectMcpProvider,
	loadMcpState,
	resolveMcpPaths,
	serializeMcpState,
	updateCursorConfig,
	validateMcpName,
	validateRemoteMcpUrl,
	type McpAgent,
	type McpPaths,
	type McpState,
	type ProviderInspection,
} from "../core/mcp.ts";
import {
	createCommandRunner,
	type CommandRunner,
	type ProcessResult,
} from "../core/process.ts";
import { resolveScopePaths } from "../core/paths.ts";
import { atomicWriteFile } from "../filesystem/atomic-write.ts";
import {
	listPendingMcpTransactions,
	recoverPendingMcpTransactions,
	runMcpTransaction,
} from "../filesystem/mcp-transaction.ts";
import { acquireOperationLock } from "../filesystem/operation-lock.ts";

interface McpProviderOperation {
	agent: McpAgent;
	action: "add" | "remove";
}

interface McpMutationPlan {
	action: "add" | "remove";
	name: string;
	url: string;
	targets: McpAgent[];
	operations: McpProviderOperation[];
	nextState: McpState;
	stateChanged: boolean;
	warnings: string[];
}

export interface McpCommandDependencies {
	cwd?: string;
	userHome?: string;
	env?: Readonly<Record<string, string | undefined>>;
	interactive?: boolean;
	write?: (text: string) => void;
	confirm?: () => Promise<boolean>;
	runner?: CommandRunner;
	now?: () => Date;
}

export async function runMcp(
	args: readonly string[],
	dependencies: McpCommandDependencies = {},
): Promise<void> {
	const options = parseMcpArguments(args);
	const userHome = resolve(dependencies.userHome ?? homedir());
	const env = dependencies.env ?? process.env;
	const paths = resolveMcpPaths(userHome, env);
	const runner = dependencies.runner ?? createCommandRunner();
	const addedAt = (dependencies.now ?? (() => new Date()))().toISOString();
	const write =
		dependencies.write ?? ((text: string) => process.stdout.write(text));

	if (options.action === "status") {
		if (options.name !== undefined) {
			validateMcpName(options.name);
		}

		await writeMcpStatus(options.name, paths, runner, env, write);
		return;
	}

	const name = validateMcpName(options.name);
	const createPlan = () =>
		options.action === "add"
			? planMcpAdd(
					name,
					validateRemoteMcpUrl(options.url),
					options.agents,
					paths,
					runner,
					env,
					addedAt,
				)
			: planMcpRemove(name, paths, runner, env);
	const pending = await listPendingMcpTransactions(paths);

	if (options.dryRun) {
		if (pending.length > 0) {
			throw new AgentsPackError(
				"RECOVERY_FAILED",
				"An interrupted MCP mutation requires recovery before a dry run. Rerun the add or remove command without --dry-run.",
			);
		}

		const plan = await createPlan();
		write(formatMcpPlan(plan, paths));
		write("Dry run only. No files changed.\n");
		return;
	}

	const interactive = dependencies.interactive ?? Boolean(process.stdin.isTTY);
	let approvedPlan: McpMutationPlan | undefined;

	if (!options.yes) {
		approvedPlan = await createPlan();
		write(formatMcpPlan(approvedPlan, paths));

		if (!hasChanges(approvedPlan)) {
			writeNoChanges(approvedPlan, write);
			return;
		}

		if (!interactive) {
			throw new AgentsPackError(
				"USAGE",
				`Non-interactive mcp ${options.action} requires --yes to apply changes.`,
				{ exitCode: 2 },
			);
		}

		if (!(await (dependencies.confirm ?? confirmApply)())) {
			write("Cancelled. No files changed.\n");
			return;
		}
	}

	const scopePaths = await resolveScopePaths("global", {
		cwd: resolve(dependencies.cwd ?? process.cwd()),
		userHome,
	});
	const lock = await acquireOperationLock(
		scopePaths,
		options.action === "add" ? "mcp-add" : "mcp-remove",
	);

	try {
		const recovered = await recoverPendingMcpTransactions(paths);
		const plan = await createPlan();

		if (
			approvedPlan !== undefined &&
			planSignature(plan) !== planSignature(approvedPlan)
		) {
			throw new AgentsPackError(
				"DRIFT",
				"The MCP plan changed after approval. Review and rerun it.",
			);
		}

		if (approvedPlan === undefined) {
			write(formatMcpPlan(plan, paths));
		}

		if (recovered.length > 0) {
			write(`Recovered ${recovered.length} interrupted MCP transaction(s).\n`);
		}

		if (!hasChanges(plan)) {
			writeNoChanges(plan, write);
			return;
		}

		await assertMutationPaths(plan, paths);
		assertNativeCommandsAvailable(plan, runner);
		await runMcpTransaction({
			paths,
			command: plan.action === "add" ? "mcp-add" : "mcp-remove",
			agents: plan.operations.map((operation) => operation.agent),
			mutate: () => applyMcpPlan(plan, paths, runner, env),
		});
		writeMcpResult(plan, write);
	} finally {
		await lock.release();
	}
}

async function planMcpAdd(
	name: string,
	url: string,
	requestedTargets: readonly McpAgent[],
	paths: McpPaths,
	runner: CommandRunner,
	env: Readonly<Record<string, string | undefined>>,
	addedAt: string,
): Promise<McpMutationPlan> {
	const state = await loadMcpState(paths.statePath);
	const existing = state.servers[name];

	if (existing !== undefined && existing.url !== url) {
		throw new AgentsPackError(
			"DRIFT",
			`${name} is already managed with ${existing.url}. Remove it before adding a different URL.`,
		);
	}

	const targets = orderedAgents(
		new Set([...(existing?.targets ?? []), ...requestedTargets]),
	);
	const operations: McpProviderOperation[] = [];

	for (const agent of targets) {
		const inspection = await inspectMcpProvider(
			agent,
			name,
			paths,
			runner,
			env,
		);
		assertUsableInspection(inspection);

		if (inspection.status === "missing") {
			operations.push({ agent, action: "add" });
			continue;
		}

		const owned = existing?.targets.includes(agent) ?? false;

		if (!owned) {
			throw new AgentsPackError(
				"OWNERSHIP_CONFLICT",
				`${name} already exists in ${agent} but is not owned by Agents Pack.`,
			);
		}

		if (normalizeComparableUrl(inspection.url) !== url) {
			throw new AgentsPackError(
				"DRIFT",
				`${name} has drifted in ${agent}: ${inspection.url}`,
			);
		}
	}

	const nextState: McpState = {
		schemaVersion: 1,
		servers: {
			...state.servers,
			[name]: {
				url,
				targets,
				addedAt: existing?.addedAt ?? addedAt,
			},
		},
	};

	return {
		action: "add",
		name,
		url,
		targets,
		operations,
		nextState,
		stateChanged:
			existing === undefined ||
			JSON.stringify(existing.targets) !== JSON.stringify(targets),
		warnings: insecureRemoteWarnings(url),
	};
}

async function planMcpRemove(
	name: string,
	paths: McpPaths,
	runner: CommandRunner,
	env: Readonly<Record<string, string | undefined>>,
): Promise<McpMutationPlan> {
	const state = await loadMcpState(paths.statePath);
	const existing = state.servers[name];

	if (existing === undefined) {
		return {
			action: "remove",
			name,
			url: "",
			targets: [],
			operations: [],
			nextState: state,
			stateChanged: false,
			warnings: [],
		};
	}

	for (const agent of existing.targets) {
		const inspection = await inspectMcpProvider(
			agent,
			name,
			paths,
			runner,
			env,
		);
		assertUsableInspection(inspection);

		if (inspection.status === "missing") {
			throw new AgentsPackError(
				"DRIFT",
				`${name} is managed for ${agent}, but its provider entry is missing.`,
			);
		}

		if (normalizeComparableUrl(inspection.url) !== existing.url) {
			throw new AgentsPackError(
				"DRIFT",
				`${name} has drifted in ${agent}: ${inspection.url}`,
			);
		}
	}

	const servers = { ...state.servers };
	delete servers[name];

	return {
		action: "remove",
		name,
		url: existing.url,
		targets: [...existing.targets],
		operations: existing.targets.map((agent) => ({ agent, action: "remove" })),
		nextState: { schemaVersion: 1, servers },
		stateChanged: true,
		warnings: [],
	};
}

async function applyMcpPlan(
	plan: McpMutationPlan,
	paths: McpPaths,
	runner: CommandRunner,
	env: Readonly<Record<string, string | undefined>>,
): Promise<void> {
	for (const operation of plan.operations) {
		if (operation.agent === "cursor") {
			const mode = await existingFileMode(paths.cursorConfigPath, 0o600);
			await mkdir(dirname(paths.cursorConfigPath), {
				recursive: true,
				mode: 0o700,
			});
			const bytes = await updateCursorConfig(
				paths.cursorConfigPath,
				plan.name,
				operation.action === "add" ? plan.url : undefined,
			);
			await atomicWriteFile(paths.cursorConfigPath, bytes, { mode });
			continue;
		}

		const command = providerCommand(operation, plan);
		let result: ProcessResult;

		try {
			result = await runner.run(operation.agent, command, env);
		} catch (cause) {
			throw new AgentsPackError(
				"EXECUTION_FAILED",
				`${operation.agent} failed to ${operation.action} ${plan.name}.`,
				{ cause },
			);
		}

		if (result.exitCode !== 0) {
			const detail = `${result.stderr}\n${result.stdout}`.trim();
			throw new AgentsPackError(
				"EXECUTION_FAILED",
				`${operation.agent} failed to ${operation.action} ${plan.name}${detail.length === 0 ? "." : `: ${detail}`}`,
			);
		}
	}

	if (plan.stateChanged) {
		const mode = await existingFileMode(paths.statePath, 0o600);
		await mkdir(paths.stateDirectory, { recursive: true, mode: 0o700 });
		await atomicWriteFile(paths.statePath, serializeMcpState(plan.nextState), {
			mode,
		});
	}
}

function providerCommand(
	operation: McpProviderOperation,
	plan: McpMutationPlan,
): string[] {
	if (operation.agent === "codex") {
		return operation.action === "add"
			? ["mcp", "add", plan.name, "--url", plan.url]
			: ["mcp", "remove", plan.name];
	}

	return operation.action === "add"
		? [
				"mcp",
				"add",
				"--transport",
				"http",
				"--scope",
				"user",
				plan.name,
				plan.url,
			]
		: ["mcp", "remove", plan.name, "--scope", "user"];
}

async function writeMcpStatus(
	name: string | undefined,
	paths: McpPaths,
	runner: CommandRunner,
	env: Readonly<Record<string, string | undefined>>,
	write: (text: string) => void,
): Promise<void> {
	const state = await loadMcpState(paths.statePath);
	const pending = await listPendingMcpTransactions(paths);
	const names = name === undefined ? Object.keys(state.servers).sort() : [name];
	let output = "MCP servers (user scope)\n";

	if (pending.length > 0) {
		output += `Recovery required: ${pending.length} interrupted transaction(s).\n`;
	}

	if (names.length === 0) {
		write(`${output}No MCP servers are managed by Agents Pack.\n`);
		return;
	}

	for (const serverName of names) {
		const managed = state.servers[serverName];
		output += `\n${serverName}${managed === undefined ? " (unmanaged)" : `\n  URL: ${managed.url}`}\n`;

		for (const agent of MCP_AGENTS) {
			const inspection = await inspectMcpProvider(
				agent,
				serverName,
				paths,
				runner,
				env,
			);
			output += `  ${agent}: ${formatInspection(inspection, managed)}\n`;
		}
	}

	write(output);
}

function formatInspection(
	inspection: ProviderInspection,
	managed: McpState["servers"][string] | undefined,
): string {
	if (inspection.status === "unavailable") {
		return `unavailable (${singleLine(inspection.detail)})`;
	}

	if (inspection.status === "malformed") {
		return `malformed (${singleLine(inspection.detail)})`;
	}

	const targeted = managed?.targets.includes(inspection.agent) ?? false;

	if (inspection.status === "missing") {
		return targeted ? "missing (drift)" : "not configured";
	}

	if (!targeted) {
		return `present, unmanaged (${inspection.url})`;
	}

	return normalizeComparableUrl(inspection.url) === managed?.url
		? "clean"
		: `drifted (${inspection.url})`;
}

function formatMcpPlan(plan: McpMutationPlan, paths: McpPaths): string {
	let output = `MCP ${plan.action} plan\n  Server: ${plan.name}\n`;

	if (plan.url.length > 0) {
		output += `  URL: ${plan.url}\n`;
	}

	output += `  Targets: ${plan.targets.join(", ") || "none"}\n`;

	if (!hasChanges(plan)) {
		output += "  Changes: none\n";
	} else {
		output += "  Changes:\n";

		for (const operation of plan.operations) {
			output += `    - ${operation.action} ${operation.agent} configuration\n`;
		}

		if (plan.stateChanged) {
			output += `    - update ${paths.statePath}\n`;
		}
	}

	for (const warning of plan.warnings) {
		output += `  Warning: ${warning}\n`;
	}

	return output;
}

async function assertMutationPaths(
	plan: McpMutationPlan,
	paths: McpPaths,
): Promise<void> {
	await assertRegularOrMissing(paths.statePath);

	for (const operation of plan.operations) {
		const path =
			operation.agent === "codex"
				? paths.codexConfigPath
				: operation.agent === "claude"
					? paths.claudeConfigPath
					: paths.cursorConfigPath;
		await assertRegularOrMissing(path);
	}
}

function assertNativeCommandsAvailable(
	plan: McpMutationPlan,
	runner: CommandRunner,
): void {
	for (const agent of plan.operations.map((operation) => operation.agent)) {
		if (agent !== "cursor" && !runner.isAvailable(agent)) {
			throw new AgentsPackError(
				"UNSUPPORTED",
				`${agent} is required for this MCP change but is not installed or is not on PATH.`,
			);
		}
	}
}

function assertUsableInspection(
	inspection: ProviderInspection,
): asserts inspection is
	| Extract<ProviderInspection, { status: "present" }>
	| Extract<ProviderInspection, { status: "missing" }> {
	if (inspection.status === "malformed") {
		throw new AgentsPackError("MALFORMED_STATE", inspection.detail);
	}

	if (inspection.status === "unavailable") {
		throw new AgentsPackError("UNSUPPORTED", inspection.detail);
	}
}

function orderedAgents(values: ReadonlySet<McpAgent>): McpAgent[] {
	return MCP_AGENTS.filter((agent) => values.has(agent));
}

function normalizeComparableUrl(value: string): string {
	try {
		return new URL(value).href;
	} catch {
		return value;
	}
}

function insecureRemoteWarnings(url: string): string[] {
	const parsed = new URL(url);

	if (
		parsed.protocol === "http:" &&
		parsed.hostname !== "localhost" &&
		parsed.hostname !== "127.0.0.1" &&
		parsed.hostname !== "[::1]"
	) {
		return ["The remote endpoint uses unencrypted HTTP."];
	}

	return [];
}

function hasChanges(plan: McpMutationPlan): boolean {
	return plan.operations.length > 0 || plan.stateChanged;
}

function planSignature(plan: McpMutationPlan): string {
	return JSON.stringify(plan);
}

function singleLine(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

async function existingFileMode(
	path: string,
	fallback: number,
): Promise<number> {
	try {
		return (await lstat(path)).mode & 0o777;
	} catch (error) {
		if (
			error instanceof Error &&
			"code" in error &&
			(error as NodeJS.ErrnoException).code === "ENOENT"
		) {
			return fallback;
		}

		throw error;
	}
}

function writeNoChanges(
	plan: McpMutationPlan,
	write: (text: string) => void,
): void {
	write(
		plan.action === "add"
			? `${plan.name} is already configured. No changes applied.\n`
			: `${plan.name} is not managed by Agents Pack. No changes applied.\n`,
	);
}

function writeMcpResult(
	plan: McpMutationPlan,
	write: (text: string) => void,
): void {
	if (plan.action === "remove") {
		write(`Removed MCP server ${plan.name}.\n`);
		return;
	}

	write(`Added MCP server ${plan.name}.\n`);
	write("Authentication is provider-specific and was not changed.\n");

	if (plan.targets.includes("codex")) {
		write(`  Codex OAuth, if required: codex mcp login ${plan.name}\n`);
	}

	if (plan.targets.includes("claude")) {
		write(`  Claude OAuth, if required: claude mcp login ${plan.name}\n`);
	}

	if (plan.targets.includes("cursor")) {
		write(
			`  Cursor OAuth, if required: agent mcp login ${plan.name} (or use Cursor settings)\n`,
		);
	}
}
