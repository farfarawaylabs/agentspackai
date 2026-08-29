import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
	chmod,
	lstat,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runMcp } from "../../src/commands/mcp.ts";
import type { CommandRunner, ProcessResult } from "../../src/core/process.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

describe("mcp command", () => {
	test("adds, reports, repeats, and removes a remote server across all providers", async () => {
		const home = await createHome();
		const cursorPath = join(home, ".cursor", "mcp.json");
		await writeJson(cursorPath, {
			telemetry: false,
			mcpServers: { existing: { url: "https://existing.example/mcp" } },
		});
		await chmod(cursorPath, 0o640);
		const runner = new FileBackedRunner(home);
		let output = "";
		const dependencies = {
			userHome: home,
			interactive: false,
			runner,
			now: () => new Date("2026-08-29T12:00:00.000Z"),
			write: (text: string) => {
				output += text;
			},
		};

		await runMcp(
			["add", "docs", "--url", "https://example.com/mcp", "--yes"],
			dependencies,
		);

		const state = await readJson(join(home, ".agents-pack", "mcp-lock.json"));
		expect(state).toEqual({
			schemaVersion: 1,
			servers: {
				docs: {
					url: "https://example.com/mcp",
					targets: ["claude", "codex", "cursor"],
					addedAt: "2026-08-29T12:00:00.000Z",
				},
			},
		});
		const cursor = await readJson(cursorPath);
		expect(cursor.telemetry).toBe(false);
		expect(cursor.mcpServers).toEqual({
			existing: { url: "https://existing.example/mcp" },
			docs: { url: "https://example.com/mcp" },
		});
		expect((await stat(cursorPath)).mode & 0o777).toBe(0o640);
		expect(runner.calls).toContainEqual([
			"codex",
			"mcp",
			"add",
			"docs",
			"--url",
			"https://example.com/mcp",
		]);

		output = "";
		await runMcp(["status", "docs"], dependencies);
		expect(output).toContain("claude: clean");
		expect(output).toContain("codex: clean");
		expect(output).toContain("cursor: clean");

		output = "";
		await runMcp(
			["add", "docs", "--url", "https://example.com/mcp", "--yes"],
			dependencies,
		);
		expect(output).toContain("already configured");

		await runMcp(["remove", "docs", "--yes"], dependencies);
		expect((await readJson(cursorPath)).mcpServers).toEqual({
			existing: { url: "https://existing.example/mcp" },
		});
		expect(
			(await readJson(join(home, ".agents-pack", "mcp-lock.json"))).servers,
		).toEqual({});
	});

	test("dry-run is read-only", async () => {
		const home = await createHome();
		let output = "";
		const runner = new FileBackedRunner(home);

		await runMcp(
			[
				"add",
				"docs",
				"--url",
				"https://example.com/mcp",
				"--agents",
				"cursor",
				"--dry-run",
			],
			{
				userHome: home,
				interactive: false,
				runner,
				write: (text) => {
					output += text;
				},
			},
		);

		expect(output).toContain("Dry run only");
		expect(await exists(join(home, ".agents-pack"))).toBe(false);
		expect(await exists(join(home, ".cursor"))).toBe(false);
	});

	test("refuses to adopt an unmanaged provider entry", async () => {
		const home = await createHome();
		await writeJson(join(home, ".cursor", "mcp.json"), {
			mcpServers: { docs: { url: "https://example.com/mcp" } },
		});

		expect(
			runMcp(
				[
					"add",
					"docs",
					"--url",
					"https://example.com/mcp",
					"--agents",
					"cursor",
					"--yes",
				],
				{
					userHome: home,
					interactive: false,
					runner: new FileBackedRunner(home),
				},
			),
		).rejects.toMatchObject({ code: "OWNERSHIP_CONFLICT" });
		expect(await exists(join(home, ".agents-pack", "mcp-lock.json"))).toBe(
			false,
		);
	});

	test("restores every changed file when a provider command fails", async () => {
		const home = await createHome();
		const codexPath = join(home, ".codex", "config.toml");
		await mkdir(dirname(codexPath), { recursive: true });
		await writeFile(codexPath, "original codex config\n");
		const runner = new FileBackedRunner(home, "codex:add");

		expect(
			runMcp(["add", "docs", "--url", "https://example.com/mcp", "--yes"], {
				userHome: home,
				interactive: false,
				runner,
				write: () => undefined,
			}),
		).rejects.toMatchObject({ code: "EXECUTION_FAILED" });

		expect(await readFile(codexPath, "utf8")).toBe("original codex config\n");
		expect(await exists(join(home, ".claude.json"))).toBe(false);
		expect(await exists(join(home, ".cursor", "mcp.json"))).toBe(false);
		expect(await exists(join(home, ".agents-pack", "mcp-lock.json"))).toBe(
			false,
		);
	});

	test("fails before mutation when a required provider CLI is unavailable", async () => {
		const home = await createHome();
		const runner = new FileBackedRunner(home);
		runner.available.delete("claude");

		expect(
			runMcp(
				[
					"add",
					"docs",
					"--url",
					"https://example.com/mcp",
					"--agents",
					"claude",
					"--yes",
				],
				{
					userHome: home,
					interactive: false,
					runner,
					write: () => undefined,
				},
			),
		).rejects.toMatchObject({ code: "UNSUPPORTED" });
		expect(await exists(join(home, ".agents-pack", "mcp-lock.json"))).toBe(
			false,
		);
	});

	test("status reports an interrupted transaction and the next mutation recovers it", async () => {
		const home = await createHome();
		const statePath = join(home, ".agents-pack", "mcp-lock.json");
		const cursorPath = join(home, ".cursor", "mcp.json");
		const transactionPath = join(
			home,
			".agents-pack",
			"mcp-transactions",
			"tx-crash",
		);
		const original = Buffer.from(
			`${JSON.stringify({ mcpServers: { existing: { url: "https://existing.example/mcp" } } }, null, 2)}\n`,
		);
		await mkdir(transactionPath, { recursive: true });
		await mkdir(dirname(cursorPath), { recursive: true });
		await writeFile(join(transactionPath, "cursor.bak"), original);
		await writeJson(cursorPath, {
			mcpServers: {
				existing: { url: "https://existing.example/mcp" },
				docs: { url: "https://example.com/mcp" },
			},
		});
		await writeJson(join(transactionPath, "journal.json"), {
			schemaVersion: 1,
			id: "tx-crash",
			command: "mcp-add",
			state: "applying",
			createdAt: "2026-08-29T12:00:00.000Z",
			snapshots: [
				{ role: "state", path: statePath, existed: false },
				{
					role: "cursor",
					path: cursorPath,
					existed: true,
					backupFile: "cursor.bak",
					sha256: createHash("sha256").update(original).digest("hex"),
					mode: 0o644,
				},
			],
		});
		let output = "";
		const dependencies = {
			userHome: home,
			interactive: false,
			runner: new FileBackedRunner(home),
			write: (text: string) => {
				output += text;
			},
		};

		await runMcp(["status", "docs"], dependencies);
		expect(output).toContain("Recovery required: 1");
		expect(await exists(transactionPath)).toBe(true);
		expect((await readJson(cursorPath)).mcpServers).toEqual({
			existing: { url: "https://existing.example/mcp" },
			docs: { url: "https://example.com/mcp" },
		});

		output = "";
		await runMcp(
			[
				"add",
				"docs",
				"--url",
				"https://example.com/mcp",
				"--agents",
				"cursor",
				"--yes",
			],
			dependencies,
		);
		expect(output).toContain("Recovered 1 interrupted MCP transaction");
		expect(await exists(transactionPath)).toBe(false);
		expect((await readJson(cursorPath)).mcpServers).toEqual({
			existing: { url: "https://existing.example/mcp" },
			docs: { url: "https://example.com/mcp" },
		});
	});
});

class FileBackedRunner implements CommandRunner {
	readonly calls: string[][] = [];
	readonly available = new Set(["claude", "codex"]);

	constructor(
		private readonly home: string,
		private readonly failure?: "claude:add" | "codex:add",
	) {}

	isAvailable(command: string): boolean {
		return this.available.has(command);
	}

	async run(command: string, args: readonly string[]): Promise<ProcessResult> {
		this.calls.push([command, ...args]);

		if (command === "codex") {
			return this.runCodex(args);
		}

		if (command === "claude") {
			return this.runClaude(args);
		}

		return { exitCode: 127, stdout: "", stderr: "not found" };
	}

	private async runCodex(args: readonly string[]): Promise<ProcessResult> {
		const action = args[1];
		const name = args[2] ?? "";
		const path = join(this.home, ".codex", "config.toml");
		const servers = await readLooseMap(path);

		if (action === "get") {
			const url = servers[name];
			return url === undefined
				? {
						exitCode: 1,
						stdout: "",
						stderr: `Error: No MCP server named '${name}' found.`,
					}
				: { exitCode: 0, stdout: `${name}\n  url: ${url}\n`, stderr: "" };
		}

		if (action === "add") {
			if (this.failure === "codex:add") {
				return { exitCode: 1, stdout: "", stderr: "injected failure" };
			}
			servers[name] = args[4] ?? "";
			await writeJson(path, servers);
			return { exitCode: 0, stdout: "", stderr: "" };
		}

		delete servers[name];
		await writeJson(path, servers);
		return { exitCode: 0, stdout: "", stderr: "" };
	}

	private async runClaude(args: readonly string[]): Promise<ProcessResult> {
		const action = args[1];
		const path = join(this.home, ".claude.json");
		const root = await readJsonOrDefault(path, {});
		const mcpServers = {
			...(isRecord(root.mcpServers) ? root.mcpServers : {}),
		};

		if (action === "add") {
			if (this.failure === "claude:add") {
				return { exitCode: 1, stdout: "", stderr: "injected failure" };
			}
			const name = args.at(-2) ?? "";
			mcpServers[name] = { type: "http", url: args.at(-1) ?? "" };
			await writeJson(path, { ...root, mcpServers });
			return { exitCode: 0, stdout: "", stderr: "" };
		}

		delete mcpServers[args[2] ?? ""];
		await writeJson(path, { ...root, mcpServers });
		return { exitCode: 0, stdout: "", stderr: "" };
	}
}

async function createHome(): Promise<string> {
	const path = await mkdtemp(join(tmpdir(), "agents-pack-mcp-test-"));
	temporaryDirectories.push(path);
	return path;
}

async function writeJson(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function readJson(path: string): Promise<Record<string, unknown>> {
	return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

async function readJsonOrDefault(
	path: string,
	fallback: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	try {
		return await readJson(path);
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

async function readLooseMap(path: string): Promise<Record<string, string>> {
	try {
		const value = await readJson(path);
		return Object.fromEntries(
			Object.entries(value).filter((entry): entry is [string, string] =>
				Boolean(typeof entry[1] === "string"),
			),
		);
	} catch {
		return {};
	}
}

async function exists(path: string): Promise<boolean> {
	try {
		await lstat(path);
		return true;
	} catch (error) {
		if (
			error instanceof Error &&
			"code" in error &&
			(error as NodeJS.ErrnoException).code === "ENOENT"
		) {
			return false;
		}
		throw error;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
