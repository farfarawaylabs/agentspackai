import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import {
	chmod,
	lstat,
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadPack } from "../../src/core/pack.ts";
import { planEject, planInit, planUpdate } from "../../src/core/plan.ts";
import { resolveScopePaths } from "../../src/core/paths.ts";
import { loadLockFile } from "../../src/core/state.ts";
import type {
	ExecutorEvent,
	LoadedPack,
	PathContext,
	ScopePaths,
} from "../../src/core/types.ts";
import { acquireOperationLock } from "../../src/filesystem/operation-lock.ts";
import { runMutation } from "../../src/filesystem/transaction.ts";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const CRASH_FIXTURE = join(PROJECT_ROOT, "tests/fixtures/transaction-crash.ts");
const temporaryDirectories: string[] = [];
let packVersionOne: LoadedPack;
let packVersionTwo: LoadedPack;

beforeAll(async () => {
	[packVersionOne, packVersionTwo] = await Promise.all([
		loadPack(join(PROJECT_ROOT, "fixtures/packs/0.1.0")),
		loadPack(join(PROJECT_ROOT, "fixtures/packs/0.2.0")),
	]);
});

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("transaction success", () => {
	test("applies a multi-file plan and leaves no transaction artifacts", async () => {
		const environment = await createEnvironment();
		const result = await initialize(environment, ["claude", "codex", "cursor"]);

		expect(result.appliedOperations).toBe(7);
		expect(
			await readFile(
				join(environment.repository, ".agents-pack/pack.toml"),
				"utf8",
			),
		).toContain('id = "agents-pack-smoke"');
		expect(
			await readFile(join(environment.repository, "AGENTS.md"), "utf8"),
		).toContain("agents-pack-instruction-v1");
		await expectNoTransactionArtifacts(environment.paths);
	});

	test("preserves existing shared-file permissions", async () => {
		const environment = await createEnvironment();
		const agentsPath = join(environment.repository, "AGENTS.md");
		await writeFile(agentsPath, "# User instructions\n");
		await chmod(agentsPath, 0o640);

		await initialize(environment, ["codex"]);
		expect((await stat(agentsPath)).mode & 0o777).toBe(0o640);

		await update(environment);
		expect((await stat(agentsPath)).mode & 0o777).toBe(0o640);
	});

	test("applies eject while preserving user-owned shared content", async () => {
		const environment = await createEnvironment();
		const agentsPath = join(environment.repository, "AGENTS.md");
		await writeFile(agentsPath, "# User instructions\n");
		await initialize(environment, ["claude", "codex", "cursor"]);

		const result = await runMutation({
			paths: environment.paths,
			command: "eject",
			createPlan: () => planEject({ context: environment.context }),
		});

		expect(result.appliedOperations).toBe(11);
		expect(await readFile(agentsPath, "utf8")).toBe("# User instructions\n");
		expect(await exists(environment.paths.stateDirectory)).toBe(false);
		expect(
			await exists(
				join(
					environment.repository,
					".claude/rules/agents-pack/ap-smoke-instructions.md",
				),
			),
		).toBe(false);
		await expectNoTransactionArtifacts(environment.paths);
	});

	test("writes lifecycle state only after target outputs validate", async () => {
		const environment = await createEnvironment();
		await initialize(environment, ["claude", "codex"]);
		let stateVersionBeforeWrite: string | undefined;
		let targetWasVersionTwo = false;

		await update(environment, async (event) => {
			if (event.point !== "before-state-write") {
				return;
			}

			stateVersionBeforeWrite = (await loadLockFile(environment.paths.lockPath))
				.pack.version;
			targetWasVersionTwo = (
				await readFile(
					join(
						environment.repository,
						".claude/rules/agents-pack/ap-smoke-instructions.md",
					),
					"utf8",
				)
			).includes("agents-pack-instruction-v2");
		});

		expect(stateVersionBeforeWrite).toBe("0.1.0");
		expect(targetWasVersionTwo).toBe(true);
		expect((await loadLockFile(environment.paths.lockPath)).pack.version).toBe(
			"0.2.0",
		);
	});
});

describe("transaction rollback", () => {
	const failureCases: {
		name: string;
		shouldFail: (event: ExecutorEvent) => boolean;
	}[] = [
		{
			name: "before the first write",
			shouldFail: (event) => event.point === "before-first-write",
		},
		{
			name: "after one file",
			shouldFail: (event) =>
				event.point === "after-operation" && event.operationIndex === 0,
		},
		{
			name: "during managed-block replacement",
			shouldFail: (event) =>
				event.point === "before-atomic-rename" &&
				event.operation?.kind === "replace-block",
		},
		{
			name: "before state writes",
			shouldFail: (event) => event.point === "before-state-write",
		},
	];

	for (const failureCase of failureCases) {
		test(`restores byte-for-byte ${failureCase.name}`, async () => {
			const environment = await createEnvironment();
			await initialize(environment, ["claude", "codex", "cursor"]);
			const before = await snapshotTree(environment.repository);

			expect(
				update(environment, async (event) => {
					if (failureCase.shouldFail(event)) {
						throw new Error(`Injected failure ${failureCase.name}`);
					}
				}),
			).rejects.toMatchObject({ code: "EXECUTION_FAILED" });

			expect(await snapshotTree(environment.repository)).toEqual(before);
			expect(
				(await loadLockFile(environment.paths.lockPath)).pack.version,
			).toBe("0.1.0");
			await expectNoTransactionArtifacts(environment.paths);
		});
	}

	test("removes newly created files and directories after failed init", async () => {
		const environment = await createEnvironment();
		const before = await snapshotTree(environment.repository);

		expect(
			initialize(environment, ["claude", "codex"], (event) => {
				if (event.point === "after-operation" && event.operationIndex === 0) {
					throw new Error("Injected failed init");
				}
			}),
		).rejects.toMatchObject({ code: "EXECUTION_FAILED" });

		expect(await snapshotTree(environment.repository)).toEqual(before);
		expect(await exists(environment.paths.stateDirectory)).toBe(false);
		await expectNoTransactionArtifacts(environment.paths);
	});

	test("refuses operations outside managed roots", async () => {
		const environment = await createEnvironment();

		expect(
			runMutation({
				paths: environment.paths,
				command: "init",
				createPlan: () => ({
					command: "init",
					scope: "repository",
					operations: [
						{
							kind: "create-file",
							path: "README.md",
							bytes: new TextEncoder().encode("unsafe"),
						},
					],
					warnings: [],
				}),
			}),
		).rejects.toMatchObject({ code: "OWNERSHIP_CONFLICT" });

		expect(await exists(join(environment.repository, "README.md"))).toBe(false);

		expect(
			runMutation({
				paths: environment.paths,
				command: "remove",
				createPlan: () => ({
					command: "remove",
					scope: "repository",
					operations: [
						{
							kind: "remove-empty-directory",
							path: ".claude/skills/user-owned-skill",
						},
					],
					warnings: [],
				}),
			}),
		).rejects.toMatchObject({ code: "OWNERSHIP_CONFLICT" });

		expect(
			runMutation({
				paths: environment.paths,
				command: "remove",
				createPlan: () => ({
					command: "remove",
					scope: "repository",
					operations: [
						{
							kind: "remove-file",
							path: ".agents-pack/user/skills/user-owned/SKILL.md",
						},
					],
					warnings: [],
				}),
			}),
		).rejects.toMatchObject({ code: "OWNERSHIP_CONFLICT" });
		await expectNoTransactionArtifacts(environment.paths);
	});
});

describe("operation locking and recovery", () => {
	test("rejects a second concurrent mutation while a live lock exists", async () => {
		const environment = await createEnvironment();
		const held = await acquireOperationLock(environment.paths, "init");

		try {
			expect(initialize(environment, ["claude"])).rejects.toMatchObject({
				code: "CONCURRENT_OPERATION",
			});
		} finally {
			await held.release();
		}
	});

	test("reports and replaces a stale operation lock", async () => {
		const environment = await createEnvironment();
		await writeFile(
			environment.paths.operationLockPath,
			JSON.stringify({
				schemaVersion: 1,
				id: "stale-lock",
				pid: 424242,
				hostname: "test",
				scope: "repository",
				command: "init",
				startedAt: "2026-01-01T00:00:00.000Z",
			}),
		);

		const result = await initialize(environment, ["claude"], undefined, {
			isProcessAlive: () => false,
		});

		expect(result.staleLockRecovered).toBe(true);
		await expectNoTransactionArtifacts(environment.paths);
	});

	test("cleans a prepared transaction before planning", async () => {
		const environment = await createEnvironment();
		await initialize(environment, ["claude"]);
		const transactionId = "tx-prepared-fixture";
		const transactionDirectory = join(
			environment.paths.transactionsDirectory,
			transactionId,
		);
		await mkdir(transactionDirectory, { recursive: true });
		await writeFile(
			join(transactionDirectory, "journal.json"),
			`${JSON.stringify(
				{
					schemaVersion: 1,
					id: transactionId,
					scope: "repository",
					command: "update",
					state: "prepared",
					createdAt: "2026-01-01T00:00:00.000Z",
					snapshots: [],
					createdDirectories: [],
					pendingEmptyDirectories: [],
				},
				null,
				2,
			)}\n`,
		);

		let transactionExistedWhilePlanning = true;
		const result = await runMutation({
			paths: environment.paths,
			command: "update",
			createPlan: async () => {
				transactionExistedWhilePlanning = await exists(transactionDirectory);
				return planUpdate({
					pack: packVersionOne,
					context: environment.context,
				});
			},
		});

		expect(transactionExistedWhilePlanning).toBe(false);
		expect(result.recoveredTransactions).toEqual([transactionId]);
		await expectNoTransactionArtifacts(environment.paths);
	});

	test("cleans a committed transaction without rolling back it", async () => {
		const environment = await createEnvironment();
		await initialize(environment, ["claude", "codex"]);

		expect(
			update(environment, (event) => {
				if (event.point === "after-commit") {
					throw new Error("Injected cleanup interruption");
				}
			}),
		).rejects.toMatchObject({ code: "EXECUTION_FAILED" });
		expect((await loadLockFile(environment.paths.lockPath)).pack.version).toBe(
			"0.2.0",
		);
		expect(await exists(environment.paths.transactionsDirectory)).toBe(true);

		const result = await runMutation({
			paths: environment.paths,
			command: "update",
			createPlan: () =>
				planUpdate({
					pack: packVersionTwo,
					context: environment.context,
				}),
		});

		expect(result.recoveredTransactions).toHaveLength(1);
		expect(result.appliedOperations).toBe(0);
		expect((await loadLockFile(environment.paths.lockPath)).pack.version).toBe(
			"0.2.0",
		);
		await expectNoTransactionArtifacts(environment.paths);
	});

	test("recovers an applying child-process transaction before replanning", async () => {
		const environment = await createEnvironment();
		await initialize(environment, ["claude", "codex", "cursor"]);
		const installedV1 = await snapshotTree(environment.repository);
		const child = Bun.spawn(
			[
				process.execPath,
				CRASH_FIXTURE,
				environment.repository,
				environment.userHome,
			],
			{
				cwd: PROJECT_ROOT,
				stdout: "pipe",
				stderr: "pipe",
			},
		);
		const [exitCode, childStderr] = await Promise.all([
			child.exited,
			new Response(child.stderr).text(),
		]);

		expect(exitCode).toBe(91);
		expect(childStderr).toBe("");
		expect(await snapshotTree(environment.repository)).not.toEqual(installedV1);

		let versionSeenWhilePlanning: string | undefined;
		const result = await runMutation({
			paths: environment.paths,
			command: "update",
			createPlan: async () => {
				versionSeenWhilePlanning = (
					await loadLockFile(environment.paths.lockPath)
				).pack.version;
				return planUpdate({
					pack: packVersionTwo,
					context: environment.context,
				});
			},
		});

		expect(versionSeenWhilePlanning).toBe("0.1.0");
		expect(result.recoveredTransactions).toHaveLength(1);
		expect(result.staleLockRecovered).toBe(true);
		expect((await loadLockFile(environment.paths.lockPath)).pack.version).toBe(
			"0.2.0",
		);
		await expectNoTransactionArtifacts(environment.paths);
	});
});

async function initialize(
	environment: TestEnvironment,
	targets: ("claude" | "codex" | "cursor")[],
	onEvent?: (event: ExecutorEvent) => void | Promise<void>,
	lockDependencies?: {
		isProcessAlive: (pid: number) => boolean;
	},
) {
	return runMutation({
		paths: environment.paths,
		command: "init",
		createPlan: () =>
			planInit({
				pack: packVersionOne,
				scope: "repository",
				targets,
				context: environment.context,
			}),
		onEvent,
		lockDependencies,
	});
}

async function update(
	environment: TestEnvironment,
	onEvent?: (event: ExecutorEvent) => void | Promise<void>,
) {
	return runMutation({
		paths: environment.paths,
		command: "update",
		createPlan: () =>
			planUpdate({
				pack: packVersionTwo,
				context: environment.context,
			}),
		onEvent,
	});
}

async function createEnvironment(): Promise<TestEnvironment> {
	const container = await mkdtemp(join(tmpdir(), "agents-pack-transaction-"));
	temporaryDirectories.push(container);
	const repository = join(container, "repository");
	const userHome = join(container, "home");
	await mkdir(join(repository, ".git"), { recursive: true });
	await mkdir(userHome, { recursive: true });
	const context = { cwd: repository, userHome };
	const paths = await resolveScopePaths("repository", context);

	return { repository, userHome, context, paths };
}

async function expectNoTransactionArtifacts(paths: ScopePaths): Promise<void> {
	expect(await exists(paths.operationLockPath)).toBe(false);
	expect(await exists(paths.transactionsDirectory)).toBe(false);
	const temporaryFiles = (await listPortableFiles(paths.root)).filter((path) =>
		path.includes(".agents-pack.tmp-"),
	);
	expect(temporaryFiles).toEqual([]);
}

async function snapshotTree(root: string): Promise<string[]> {
	const entries: string[] = [];

	async function visit(directory: string): Promise<void> {
		const children = await readdir(directory, { withFileTypes: true });

		for (const child of children.sort((left, right) =>
			compareStrings(left.name, right.name),
		)) {
			const absolute = join(directory, child.name);
			const portable = absolute.slice(root.length + 1);

			if (child.isDirectory()) {
				entries.push(`${portable}/`);
				await visit(absolute);
			} else {
				const bytes = await readFile(absolute);
				const mode = (await stat(absolute)).mode & 0o777;
				entries.push(
					`${portable}:${mode.toString(8)}:${Buffer.from(bytes).toString("hex")}`,
				);
			}
		}
	}

	await visit(root);
	return entries;
}

async function listPortableFiles(root: string): Promise<string[]> {
	return (await snapshotTree(root))
		.filter((entry) => !entry.endsWith("/"))
		.map((entry) => entry.slice(0, entry.indexOf(":")));
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

function compareStrings(left: string, right: string): number {
	if (left < right) {
		return -1;
	}

	if (left > right) {
		return 1;
	}

	return 0;
}

interface TestEnvironment {
	repository: string;
	userHome: string;
	context: PathContext;
	paths: ScopePaths;
}
