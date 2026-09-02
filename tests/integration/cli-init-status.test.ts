import { afterEach, describe, expect, test } from "bun:test";
import {
	lstat,
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { InitArguments } from "../../src/cli/arguments.ts";
import { runEject } from "../../src/commands/eject.ts";
import { runInit } from "../../src/commands/init.ts";
import { runUpdate } from "../../src/commands/update.ts";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const CLI_PATH = join(PROJECT_ROOT, "src/cli/main.ts");
const PACK_V1 = join(PROJECT_ROOT, "fixtures/packs/0.1.0");
const PACK_V2 = join(PROJECT_ROOT, "fixtures/packs/0.2.0");
const CORE_PACK = join(PROJECT_ROOT, "content/packs/core");
const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("init CLI", () => {
	test("initializes an empty repository for all targets and repeats as a no-op", async () => {
		const environment = await createEnvironment();
		const args = initArgs("repository", "claude,codex,cursor");
		const first = await runCli(environment, args);

		expect(first.exitCode).toBe(0);
		expect(first.stdout).toContain("Initialized agents-pack-smoke@0.1.0");
		expect(first.stdout).toContain("Warnings:");
		expect(
			await exists(
				join(
					environment.repository,
					".claude/rules/agents-pack/ap-smoke-instructions.md",
				),
			),
		).toBe(true);
		expect(
			await exists(
				join(
					environment.repository,
					".cursor/rules/agents-pack/ap-smoke-instructions.mdc",
				),
			),
		).toBe(true);
		expect(
			await readFile(join(environment.repository, "AGENTS.md"), "utf8"),
		).toContain("agents-pack-instruction-v1");

		const beforeRepeat = await snapshotTree(environment.repository);
		const repeated = await runCli(environment, args);
		expect(repeated.exitCode).toBe(0);
		expect(repeated.stdout).toContain("No changes.");
		expect(await snapshotTree(environment.repository)).toEqual(beforeRepeat);

		const changed = await runCli(environment, initArgs("repository", "claude"));
		expect(changed.exitCode).not.toBe(0);
		expect(changed.stderr).toContain(
			"already initialized with different settings",
		);
		expect(await snapshotTree(environment.repository)).toEqual(beforeRepeat);
	});

	test("preserves an existing AGENTS.md and initializes only selected targets", async () => {
		const environment = await createEnvironment();
		const original = "# User-owned instructions\n";
		await writeFile(join(environment.repository, "AGENTS.md"), original);

		const result = await runCli(environment, initArgs("repository", "codex"));

		expect(result.exitCode).toBe(0);
		const agents = await readFile(
			join(environment.repository, "AGENTS.md"),
			"utf8",
		);
		expect(agents.startsWith(original)).toBe(true);
		expect(agents).toContain("agents-pack:start");
		expect(
			await exists(
				join(
					environment.repository,
					".claude/rules/agents-pack/ap-smoke-instructions.md",
				),
			),
		).toBe(false);
		expect(
			await exists(
				join(
					environment.repository,
					".agents/skills/agents-pack-smoke-test/SKILL.md",
				),
			),
		).toBe(true);
	});

	test("installs native subagent definitions from a schema version 1 pack", async () => {
		const environment = await createEnvironment();
		const args = initArgsForPack(
			"repository",
			"claude,codex,cursor",
			CORE_PACK,
			"all",
		);
		const first = await runCli(environment, args);

		expect(first.exitCode).toBe(0);
		expect(first.stdout).toContain("Initialized agents-pack-core@0.31.0");
		expect(
			await readFile(
				join(
					environment.repository,
					".claude/skills/ap-start-dev-session/SKILL.md",
				),
				"utf8",
			),
		).toContain("default to a dedicated");
		expect(
			await readFile(
				join(
					environment.repository,
					".agents/skills/ap-start-dev-session/SKILL.md",
				),
				"utf8",
			),
		).toContain("name: ap-start-dev-session");
		expect(
			await readFile(
				join(environment.repository, ".claude/agents/ap-code-reviewer.md"),
				"utf8",
			),
		).toContain("permissionMode: plan");
		expect(
			await readFile(
				join(environment.repository, ".codex/agents/ap-code-reviewer.toml"),
				"utf8",
			),
		).toContain('sandbox_mode = "read-only"');
		expect(
			await readFile(
				join(environment.repository, ".cursor/agents/ap-code-reviewer.md"),
				"utf8",
			),
		).toContain("readonly: true");
		expect(
			await readFile(
				join(environment.repository, ".claude/agents/ap-trend-researcher.md"),
				"utf8",
			),
		).toContain("permissionMode: plan");
		expect(
			await readFile(
				join(environment.repository, ".codex/agents/ap-trend-researcher.toml"),
				"utf8",
			),
		).toContain('sandbox_mode = "read-only"');
		expect(
			await readFile(
				join(environment.repository, ".cursor/agents/ap-trend-researcher.md"),
				"utf8",
			),
		).toContain("readonly: true");
		expect(
			await readFile(
				join(environment.repository, ".claude/agents/ap-ux-researcher.md"),
				"utf8",
			),
		).toContain("permissionMode: plan");
		expect(
			await readFile(
				join(environment.repository, ".codex/agents/ap-ux-researcher.toml"),
				"utf8",
			),
		).toContain('sandbox_mode = "read-only"');
		expect(
			await readFile(
				join(environment.repository, ".cursor/agents/ap-ux-researcher.md"),
				"utf8",
			),
		).toContain("readonly: true");
		expect(
			await readFile(
				join(
					environment.repository,
					".claude/agents/ap-backend-python-developer.md",
				),
				"utf8",
			),
		).toContain("permissionMode: default");
		expect(
			await readFile(
				join(
					environment.repository,
					".codex/agents/ap-backend-python-developer.toml",
				),
				"utf8",
			),
		).toContain('sandbox_mode = "workspace-write"');
		expect(
			await readFile(
				join(
					environment.repository,
					".cursor/agents/ap-backend-python-developer.md",
				),
				"utf8",
			),
		).toContain("readonly: false");
		expect(
			await readFile(
				join(
					environment.repository,
					".claude/agents/ap-backend-typescript-developer.md",
				),
				"utf8",
			),
		).toContain("permissionMode: default");
		expect(
			await readFile(
				join(
					environment.repository,
					".codex/agents/ap-backend-typescript-developer.toml",
				),
				"utf8",
			),
		).toContain('sandbox_mode = "workspace-write"');
		expect(
			await readFile(
				join(
					environment.repository,
					".cursor/agents/ap-backend-typescript-developer.md",
				),
				"utf8",
			),
		).toContain("readonly: false");
		expect(
			await readFile(
				join(environment.repository, ".claude/agents/ap-ux-enhancer.md"),
				"utf8",
			),
		).toContain("permissionMode: default");
		expect(
			await readFile(
				join(environment.repository, ".codex/agents/ap-ux-enhancer.toml"),
				"utf8",
			),
		).toContain('sandbox_mode = "workspace-write"');
		expect(
			await readFile(
				join(environment.repository, ".cursor/agents/ap-ux-enhancer.md"),
				"utf8",
			),
		).toContain("readonly: false");

		const beforeRepeat = await snapshotTree(environment.repository);
		const repeated = await runCli(environment, args);
		expect(repeated.exitCode).toBe(0);
		expect(repeated.stdout).toContain("No changes.");
		expect(await snapshotTree(environment.repository)).toEqual(beforeRepeat);
	});

	test("keeps global Claude and Codex output under the configured home", async () => {
		const environment = await createEnvironment();
		const beforeRepository = await snapshotTree(environment.repository);
		const result = await runCli(
			environment,
			initArgs("global", "claude,codex"),
		);

		expect(result.exitCode).toBe(0);
		expect(await exists(join(environment.userHome, ".codex/AGENTS.md"))).toBe(
			true,
		);
		expect(
			await exists(
				join(
					environment.userHome,
					".claude/rules/agents-pack/ap-smoke-instructions.md",
				),
			),
		).toBe(true);
		expect(await snapshotTree(environment.repository)).toEqual(
			beforeRepository,
		);

		const status = await runCli(environment, ["status"]);
		expect(status.stdout).toContain("Scope: global");
		expect(status.stdout).toContain("Agents: claude, codex");
	});

	test("rejects global Cursor without writing", async () => {
		const environment = await createEnvironment();
		const before = await snapshotTree(environment.userHome);
		const result = await runCli(environment, initArgs("global", "cursor"));

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("UNSUPPORTED");
		expect(await snapshotTree(environment.userHome)).toEqual(before);
	});

	test("dry-run and non-TTY missing --yes never write", async () => {
		const dryRunEnvironment = await createEnvironment();
		const dryRun = await runCli(dryRunEnvironment, [
			"init",
			"--scope",
			"repository",
			"--agents",
			"claude",
			"--pack",
			PACK_V1,
			"--components",
			"recommended",
			"--dry-run",
		]);

		expect(dryRun.exitCode).toBe(0);
		expect(dryRun.stdout).toContain("Dry run only");
		expect(await exists(dryRunEnvironment.repositoryState)).toBe(false);

		const refusalEnvironment = await createEnvironment();
		const refused = await runCli(refusalEnvironment, [
			"init",
			"--scope",
			"repository",
			"--agents",
			"claude",
			"--pack",
			PACK_V1,
			"--components",
			"recommended",
		]);
		expect(refused.exitCode).toBe(2);
		expect(refused.stderr).toContain("requires --yes");
		expect(await exists(refusalEnvironment.repositoryState)).toBe(false);
	});

	test("interactive command service defaults confirmation to cancellation", async () => {
		const environment = await createEnvironment();
		const output: string[] = [];
		let promptReceived: InitArguments | undefined;

		await runInit(["--pack", PACK_V1], {
			cwd: environment.repository,
			userHome: environment.userHome,
			interactive: true,
			write: (text) => output.push(text),
			promptForArguments: async (partial) => {
				promptReceived = partial;
				return {
					...partial,
					scope: "repository",
					agents: ["claude"],
				};
			},
			promptForComponents: async () => ({ kind: "recommended" }),
			confirm: async () => false,
		});

		expect(promptReceived?.packPath).toBe(PACK_V1);
		expect(output.join("")).toContain("Cancelled. No files changed.");
		expect(await exists(environment.repositoryState)).toBe(false);
	});

	test("interactive confirmation applies through the same command service", async () => {
		const environment = await createEnvironment();
		const output: string[] = [];

		await runInit(
			["--scope", "repository", "--agents", "claude", "--pack", PACK_V1],
			{
				cwd: environment.repository,
				userHome: environment.userHome,
				interactive: true,
				write: (text) => output.push(text),
				promptForComponents: async () => ({ kind: "recommended" }),
				confirm: async () => true,
			},
		);

		expect(output.join("")).toContain("Initialized agents-pack-smoke@0.1.0");
		expect(
			await exists(
				join(
					environment.repository,
					".claude/rules/agents-pack/ap-smoke-instructions.md",
				),
			),
		).toBe(true);
	});
});

describe("update CLI", () => {
	test("previews, applies, and repeats a clean update while preserving user text", async () => {
		const environment = await createEnvironment();
		const agentsPath = join(environment.repository, "AGENTS.md");
		await writeFile(agentsPath, "# User before\n");
		await runCli(environment, initArgs("repository", "claude,codex,cursor"));
		await writeFile(
			agentsPath,
			`${await readFile(agentsPath, "utf8")}\n# User after\n`,
		);
		const beforeDryRun = await snapshotTree(environment.repository);

		const dryRun = await runCli(environment, [
			"update",
			"--pack",
			PACK_V2,
			"--dry-run",
		]);
		expect(dryRun.exitCode).toBe(0);
		expect(dryRun.stdout).toContain("REPLACE BLOCK");
		expect(dryRun.stdout).toContain("Dry run only");
		expect(await snapshotTree(environment.repository)).toEqual(beforeDryRun);

		const applied = await runCli(environment, [
			"update",
			"--pack",
			PACK_V2,
			"--yes",
		]);
		expect(applied.exitCode).toBe(0);
		expect(applied.stdout).toContain("Updated agents-pack-smoke to 0.2.0");
		expect(applied.stdout).toContain(
			"Update the smoke-test instruction and skill to version two.",
		);
		expect(await readFile(agentsPath, "utf8")).toContain(
			"agents-pack-instruction-v2",
		);
		expect(await readFile(agentsPath, "utf8")).toContain("# User before");
		expect(await readFile(agentsPath, "utf8")).toContain("# User after");
		expect(
			await readFile(
				join(
					environment.repository,
					".claude/skills/agents-pack-smoke-test/SKILL.md",
				),
				"utf8",
			),
		).toContain("agents-pack-skill-v2");
		expect(
			JSON.parse(
				await readFile(join(environment.repositoryState, "lock.json"), "utf8"),
			).pack.version,
		).toBe("0.2.0");

		const beforeRepeat = await snapshotTree(environment.repository);
		const repeated = await runCli(environment, [
			"update",
			"--pack",
			PACK_V2,
			"--yes",
		]);
		expect(repeated.exitCode).toBe(0);
		expect(repeated.stdout).toContain("No changes.");
		expect(repeated.stdout).toContain("already at this version");
		expect(await snapshotTree(environment.repository)).toEqual(beforeRepeat);
	});

	test("refuses managed-file and managed-block drift before writing", async () => {
		const fileEnvironment = await createEnvironment();
		await runCli(fileEnvironment, initArgs("repository", "claude"));
		await writeFile(
			join(
				fileEnvironment.repository,
				".claude/rules/agents-pack/ap-smoke-instructions.md",
			),
			"modified\n",
		);
		const fileBefore = await snapshotTree(fileEnvironment.repository);
		const fileResult = await runCli(fileEnvironment, [
			"update",
			"--pack",
			PACK_V2,
			"--yes",
		]);
		expect(fileResult.exitCode).not.toBe(0);
		expect(fileResult.stderr).toContain("DRIFT");
		expect(await snapshotTree(fileEnvironment.repository)).toEqual(fileBefore);

		const blockEnvironment = await createEnvironment();
		await runCli(blockEnvironment, initArgs("repository", "codex"));
		const agentsPath = join(blockEnvironment.repository, "AGENTS.md");
		await writeFile(
			agentsPath,
			(await readFile(agentsPath, "utf8")).replace(
				"smoke-test instruction",
				"edited instruction",
			),
		);
		const blockBefore = await snapshotTree(blockEnvironment.repository);
		const blockResult = await runCli(blockEnvironment, [
			"update",
			"--pack",
			PACK_V2,
			"--yes",
		]);
		expect(blockResult.exitCode).not.toBe(0);
		expect(blockResult.stderr).toContain("DRIFT");
		expect(await snapshotTree(blockEnvironment.repository)).toEqual(
			blockBefore,
		);
	});

	test("rejects invalid proposed packs and non-TTY apply without --yes", async () => {
		const invalidEnvironment = await createEnvironment();
		await runCli(invalidEnvironment, initArgs("repository", "claude"));
		const beforeInvalid = await snapshotTree(invalidEnvironment.repository);
		const invalid = await runCli(invalidEnvironment, [
			"update",
			"--pack",
			join(invalidEnvironment.repository, "missing-pack"),
			"--yes",
		]);
		expect(invalid.exitCode).not.toBe(0);
		expect(invalid.stderr).toContain("INVALID_PACK");
		expect(await snapshotTree(invalidEnvironment.repository)).toEqual(
			beforeInvalid,
		);

		const refusalEnvironment = await createEnvironment();
		await runCli(refusalEnvironment, initArgs("repository", "claude"));
		const beforeRefusal = await snapshotTree(refusalEnvironment.repository);
		const refused = await runCli(refusalEnvironment, [
			"update",
			"--pack",
			PACK_V2,
		]);
		expect(refused.exitCode).toBe(2);
		expect(refused.stderr).toContain("requires --yes");
		expect(await snapshotTree(refusalEnvironment.repository)).toEqual(
			beforeRefusal,
		);
	});

	test("rolls back an injected command-service failure", async () => {
		const environment = await createEnvironment();
		await runCli(environment, initArgs("repository", "claude,codex,cursor"));
		const before = await snapshotTree(environment.repository);

		expect(
			runUpdate(["--pack", PACK_V2, "--yes"], {
				cwd: environment.repository,
				userHome: environment.userHome,
				interactive: false,
				write: () => undefined,
				onExecutorEvent: (event) => {
					if (event.point === "after-operation" && event.operationIndex === 0) {
						throw new Error("Injected CLI update failure");
					}
				},
			}),
		).rejects.toMatchObject({ code: "EXECUTION_FAILED" });

		expect(await snapshotTree(environment.repository)).toEqual(before);
		const status = await runCli(environment, ["status"]);
		expect(status.stdout).toContain("Pack: agents-pack-smoke@0.1.0");
	});

	test("updates a global installation without changing the repository", async () => {
		const environment = await createEnvironment();
		await runCli(environment, initArgs("global", "claude,codex"));
		const repositoryBefore = await snapshotTree(environment.repository);
		const result = await runCli(environment, [
			"update",
			"--pack",
			PACK_V2,
			"--yes",
		]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("global scope");
		expect(
			await readFile(join(environment.userHome, ".codex/AGENTS.md"), "utf8"),
		).toContain("agents-pack-instruction-v2");
		expect(await snapshotTree(environment.repository)).toEqual(
			repositoryBefore,
		);
	});
});

describe("eject CLI", () => {
	test("previews and cleanly ejects a repository while preserving user content", async () => {
		const environment = await createEnvironment();
		const agentsPath = join(environment.repository, "AGENTS.md");
		const userBefore = "# User before\n";
		const userAfter = "\n# User after\n";
		await writeFile(agentsPath, userBefore);
		await runCli(environment, initArgs("repository", "claude,codex,cursor"));
		await writeFile(
			agentsPath,
			`${await readFile(agentsPath, "utf8")}${userAfter}`,
		);
		const unrelatedPath = join(
			environment.repository,
			".claude/rules/agents-pack/user-note.md",
		);
		await writeFile(unrelatedPath, "user owned\n");
		const beforeDryRun = await snapshotTree(environment.repository);

		const dryRun = await runCli(environment, ["eject", "--dry-run"]);
		expect(dryRun.exitCode).toBe(0);
		expect(dryRun.stdout).toContain("REMOVE BLOCK");
		expect(dryRun.stdout).toContain("Dry run only");
		expect(await snapshotTree(environment.repository)).toEqual(beforeDryRun);

		const applied = await runCli(environment, ["eject", "--yes"]);
		expect(applied.exitCode).toBe(0);
		expect(applied.stdout).toContain(
			"Ejected Agents Pack from repository scope",
		);
		expect(await readFile(agentsPath, "utf8")).toBe(
			`${userBefore}${userAfter}`,
		);
		expect(await exists(unrelatedPath)).toBe(true);
		expect(await readFile(unrelatedPath, "utf8")).toBe("user owned\n");
		expect(await exists(environment.repositoryState)).toBe(false);
		expect(
			await exists(
				join(
					environment.repository,
					".cursor/rules/agents-pack/ap-smoke-instructions.mdc",
				),
			),
		).toBe(false);

		const status = await runCli(environment, ["status"]);
		expect(status.exitCode).not.toBe(0);
		expect(status.stderr).toContain("NOT_INITIALIZED");
	});

	test("ejects a global installation without changing the repository", async () => {
		const environment = await createEnvironment();
		await runCli(environment, initArgs("global", "claude,codex"));
		const repositoryBefore = await snapshotTree(environment.repository);
		const result = await runCli(environment, ["eject", "--yes"]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("global scope");
		expect(
			await exists(join(environment.userHome, ".agents-pack/config.toml")),
		).toBe(false);
		expect(
			await exists(join(environment.userHome, ".agents-pack/lock.json")),
		).toBe(false);
		expect(
			await exists(join(environment.userHome, ".agents-pack/cache/packs")),
		).toBe(true);
		expect(await exists(join(environment.userHome, ".codex/AGENTS.md"))).toBe(
			true,
		);
		expect(
			await readFile(join(environment.userHome, ".codex/AGENTS.md"), "utf8"),
		).toBe("");
		expect(await snapshotTree(environment.repository)).toEqual(
			repositoryBefore,
		);
	});

	test("refuses modified files and malformed managed blocks before writing", async () => {
		const fileEnvironment = await createEnvironment();
		await runCli(fileEnvironment, initArgs("repository", "claude"));
		await writeFile(
			join(
				fileEnvironment.repository,
				".claude/rules/agents-pack/ap-smoke-instructions.md",
			),
			"modified\n",
		);
		const fileBefore = await snapshotTree(fileEnvironment.repository);
		const fileResult = await runCli(fileEnvironment, ["eject", "--yes"]);
		expect(fileResult.exitCode).not.toBe(0);
		expect(fileResult.stderr).toContain("DRIFT");
		expect(await snapshotTree(fileEnvironment.repository)).toEqual(fileBefore);

		const blockEnvironment = await createEnvironment();
		await runCli(blockEnvironment, initArgs("repository", "codex"));
		await writeFile(
			join(blockEnvironment.repository, "AGENTS.md"),
			"<!-- agents-pack:start id=ap-smoke-instructions version=0.1.0 -->\n",
		);
		const blockBefore = await snapshotTree(blockEnvironment.repository);
		const blockResult = await runCli(blockEnvironment, ["eject", "--yes"]);
		expect(blockResult.exitCode).not.toBe(0);
		expect(blockResult.stderr).toContain("DRIFT");
		expect(await snapshotTree(blockEnvironment.repository)).toEqual(
			blockBefore,
		);
	});

	test("non-TTY refusal and interactive cancellation do not write", async () => {
		const refusalEnvironment = await createEnvironment();
		await runCli(refusalEnvironment, initArgs("repository", "claude"));
		const beforeRefusal = await snapshotTree(refusalEnvironment.repository);
		const refused = await runCli(refusalEnvironment, ["eject"]);
		expect(refused.exitCode).toBe(2);
		expect(refused.stderr).toContain("requires --yes");
		expect(await snapshotTree(refusalEnvironment.repository)).toEqual(
			beforeRefusal,
		);

		const cancellationEnvironment = await createEnvironment();
		await runCli(cancellationEnvironment, initArgs("repository", "claude"));
		const beforeCancellation = await snapshotTree(
			cancellationEnvironment.repository,
		);
		const output: string[] = [];
		await runEject([], {
			cwd: cancellationEnvironment.repository,
			userHome: cancellationEnvironment.userHome,
			interactive: true,
			write: (text) => output.push(text),
			confirm: async () => false,
		});
		expect(output.join("")).toContain("Cancelled. No files changed.");
		expect(await snapshotTree(cancellationEnvironment.repository)).toEqual(
			beforeCancellation,
		);
	});

	test("rolls back an injected eject failure", async () => {
		const environment = await createEnvironment();
		await runCli(environment, initArgs("repository", "claude,codex,cursor"));
		const before = await snapshotTree(environment.repository);

		expect(
			runEject(["--yes"], {
				cwd: environment.repository,
				userHome: environment.userHome,
				interactive: false,
				write: () => undefined,
				onExecutorEvent: (event) => {
					if (event.point === "after-operation" && event.operationIndex === 0) {
						throw new Error("Injected eject failure");
					}
				},
			}),
		).rejects.toMatchObject({ code: "EXECUTION_FAILED" });

		expect(await snapshotTree(environment.repository)).toEqual(before);
		const status = await runCli(environment, ["status"]);
		expect(status.stdout).toContain("Pack: agents-pack-smoke@0.1.0");
	});
});

describe("status CLI", () => {
	test("reports clean, missing, modified, and malformed managed outputs", async () => {
		const environment = await createEnvironment();
		await runCli(environment, initArgs("repository", "claude,codex,cursor"));

		const clean = await runCli(environment, ["status"]);
		expect(clean.exitCode).toBe(0);
		expect(clean.stdout).toContain("Pack: agents-pack-smoke@0.1.0");
		expect(clean.stdout).toContain("clean");

		await rm(
			join(
				environment.repository,
				".agents/skills/agents-pack-smoke-test/SKILL.md",
			),
		);
		await writeFile(
			join(
				environment.repository,
				".claude/rules/agents-pack/ap-smoke-instructions.md",
			),
			"modified\n",
		);
		await writeFile(
			join(environment.repository, "AGENTS.md"),
			"<!-- agents-pack:start id=ap-smoke-instructions version=0.1.0 -->\n",
		);

		const drifted = await runCli(environment, ["status"]);
		expect(drifted.exitCode).toBe(0);
		expect(drifted.stdout).toContain("missing");
		expect(drifted.stdout).toContain("modified");
		expect(drifted.stdout).toContain("malformed");
	});

	test("keeps a managed block clean after user-only edits outside it", async () => {
		const environment = await createEnvironment();
		const agentsPath = join(environment.repository, "AGENTS.md");
		await writeFile(agentsPath, "# User before\n");
		await runCli(environment, initArgs("repository", "codex"));
		await writeFile(
			agentsPath,
			`${await readFile(agentsPath, "utf8")}\n# User after\n`,
		);

		const status = await runCli(environment, ["status"]);
		expect(status.stdout).toContain(
			"clean     AGENTS.md#ap-smoke-instructions",
		);
	});

	test("reports an unfinished transaction without recovering or writing", async () => {
		const environment = await createEnvironment();
		await runCli(environment, initArgs("repository", "claude"));
		const transactionDirectory = join(
			environment.repositoryState,
			"transactions/tx-unfinished",
		);
		await mkdir(transactionDirectory, { recursive: true });
		await writeFile(
			join(transactionDirectory, "journal.json"),
			JSON.stringify({ state: "applying" }),
		);
		const before = await snapshotTree(environment.repository);

		const status = await runCli(environment, ["status"]);

		expect(status.exitCode).toBe(0);
		expect(status.stdout).toContain("Recovery required.");
		expect(status.stdout).toContain("tx-unfinished (applying)");
		expect(await snapshotTree(environment.repository)).toEqual(before);
	});
});

function initArgs(scope: "global" | "repository", agents: string): string[] {
	return initArgsForPack(scope, agents, PACK_V1);
}

function initArgsForPack(
	scope: "global" | "repository",
	agents: string,
	pack: string,
	components = "recommended",
): string[] {
	return [
		"init",
		"--scope",
		scope,
		"--agents",
		agents,
		"--pack",
		pack,
		"--components",
		components,
		"--yes",
	];
}

async function runCli(
	environment: TestEnvironment,
	args: readonly string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	const child = Bun.spawn([process.execPath, CLI_PATH, ...args], {
		cwd: environment.repository,
		env: {
			...process.env,
			HOME: environment.userHome,
		},
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	return { exitCode, stdout, stderr };
}

async function createEnvironment(): Promise<TestEnvironment> {
	const container = await mkdtemp(join(tmpdir(), "agents-pack-cli-"));
	temporaryDirectories.push(container);
	const repository = join(container, "repository");
	const userHome = join(container, "home");
	await mkdir(join(repository, ".git"), { recursive: true });
	await mkdir(userHome, { recursive: true });
	return {
		repository,
		userHome,
		repositoryState: join(repository, ".agents-pack"),
	};
}

async function snapshotTree(root: string): Promise<string[]> {
	const entries: string[] = [];

	async function visit(directory: string): Promise<void> {
		for (const entry of (
			await readdir(directory, { withFileTypes: true })
		).sort((left, right) =>
			left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
		)) {
			const absolute = join(directory, entry.name);
			const portable = absolute.slice(root.length + 1);

			if (entry.isDirectory()) {
				entries.push(`${portable}/`);
				await visit(absolute);
			} else {
				entries.push(
					`${portable}:${Buffer.from(await readFile(absolute)).toString("hex")}`,
				);
			}
		}
	}

	await visit(root);
	return entries;
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

interface TestEnvironment {
	repository: string;
	userHome: string;
	repositoryState: string;
}
