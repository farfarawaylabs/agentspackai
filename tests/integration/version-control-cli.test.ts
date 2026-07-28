import { afterEach, describe, expect, test } from "bun:test";
import {
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runRollback } from "../../src/commands/version-control.ts";
import { loadLockFile, loadScopeConfig } from "../../src/core/state.ts";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const CLI_PATH = join(PROJECT_ROOT, "src/cli/main.ts");
const PACK_V1 = join(PROJECT_ROOT, "fixtures/packs/0.1.0");
const PACK_V2 = join(PROJECT_ROOT, "fixtures/packs/0.2.0");
const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("pack release and version control", () => {
	test("checks a candidate update and prints release notes without writing", async () => {
		const environment = await createEnvironment();
		await initialize(environment);
		const before = await snapshotTree(environment.repository);
		const homeBefore = await snapshotTree(environment.userHome);
		const result = await runCli(environment, [
			"update",
			"--check",
			"--pack",
			PACK_V2,
		]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Current: agents-pack-smoke@0.1.0");
		expect(result.stdout).toContain("Candidate: agents-pack-smoke@0.2.0");
		expect(result.stdout).toContain("Status: Update available.");
		expect(result.stdout).toContain(
			"Update the smoke-test instruction and skill to version two.",
		);
		expect(await snapshotTree(environment.repository)).toEqual(before);
		expect(await snapshotTree(environment.userHome)).toEqual(homeBefore);
	});

	test("pins, reports, blocks, and unpins forward updates", async () => {
		const environment = await createEnvironment();
		await initialize(environment);

		const pinned = await runCli(environment, ["pin"]);
		expect(pinned.exitCode).toBe(0);
		expect(pinned.stdout).toContain("Pinned Agents Pack to 0.1.0");
		expect(
			(await loadScopeConfig(environment.configPath)).pack.pinnedVersion,
		).toBe("0.1.0");
		const pinnedTree = await snapshotTree(environment.repository);
		const repeatedPin = await runCli(environment, ["pin"]);
		expect(repeatedPin.stdout).toContain("already pinned");
		expect(await snapshotTree(environment.repository)).toEqual(pinnedTree);

		const status = await runCli(environment, ["status"]);
		expect(status.stdout).toContain("Pin: 0.1.0");
		const check = await runCli(environment, [
			"update",
			"--check",
			"--pack",
			PACK_V2,
		]);
		expect(check.stdout).toContain("Update available, but");
		expect(check.stdout).toContain("pinned to 0.1.0");

		const blocked = await runCli(environment, [
			"update",
			"--pack",
			PACK_V2,
			"--yes",
		]);
		expect(blocked.exitCode).toBe(1);
		expect(blocked.stderr).toContain("PINNED");
		expect((await loadLockFile(environment.lockPath)).pack.version).toBe(
			"0.1.0",
		);

		const unpinned = await runCli(environment, ["unpin"]);
		expect(unpinned.exitCode).toBe(0);
		expect(unpinned.stdout).toContain("Forward updates are allowed");
		expect(
			(await loadScopeConfig(environment.configPath)).pack.pinnedVersion,
		).toBeUndefined();
		const unpinnedTree = await snapshotTree(environment.repository);
		const repeatedUnpin = await runCli(environment, ["unpin"]);
		expect(repeatedUnpin.stdout).toContain("already unpinned");
		expect(await snapshotTree(environment.repository)).toEqual(unpinnedTree);

		const updated = await runCli(environment, [
			"update",
			"--pack",
			PACK_V2,
			"--yes",
		]);
		expect(updated.exitCode).toBe(0);
		expect((await loadLockFile(environment.lockPath)).pack.version).toBe(
			"0.2.0",
		);
	});

	test("rolls back to the newest older cached pack and preserves user sources", async () => {
		const environment = await createEnvironment();
		await initialize(environment);
		await runCli(environment, [
			"create",
			"skill",
			"project-conventions",
			"--description",
			"Capture project conventions when asked.",
			"--yes",
		]);
		const userSkill = join(
			environment.repository,
			".agents-pack/user/skills/project-conventions/SKILL.md",
		);
		const userBefore = await readFile(userSkill);
		await runCli(environment, ["update", "--pack", PACK_V2, "--yes"]);

		const beforeDryRun = await snapshotTree(environment.repository);
		const dryRun = await runCli(environment, ["rollback", "--dry-run"]);
		expect(dryRun.exitCode).toBe(0);
		expect(dryRun.stdout).toContain("Rollback: 0.2.0 -> 0.1.0");
		expect(dryRun.stdout).toContain("Dry run only");
		expect(await snapshotTree(environment.repository)).toEqual(beforeDryRun);

		const rolledBack = await runCli(environment, ["rollback", "--yes"]);
		expect(rolledBack.exitCode).toBe(0);
		expect(rolledBack.stdout).toContain(
			"Rolled back agents-pack-smoke to 0.1.0 and pinned it",
		);
		expect((await loadLockFile(environment.lockPath)).pack.version).toBe(
			"0.1.0",
		);
		expect(
			(await loadScopeConfig(environment.configPath)).pack.pinnedVersion,
		).toBe("0.1.0");
		expect(await readFile(userSkill)).toEqual(userBefore);
	});

	test("requires an older cached version", async () => {
		const environment = await createEnvironment();
		await initialize(environment);

		const missing = await runCli(environment, ["rollback", "0.0.1", "--yes"]);
		expect(missing.exitCode).toBe(2);
		expect(missing.stderr).toContain("not available in the local cache");

		const none = await runCli(environment, ["rollback", "--yes"]);
		expect(none.exitCode).toBe(2);
		expect(none.stderr).toContain("No cached version older");
	});

	test("rejects a pin that disagrees with the installed lock", async () => {
		const environment = await createEnvironment();
		await initialize(environment);
		const config = await readFile(environment.configPath, "utf8");
		await writeFile(
			environment.configPath,
			config.replace(
				'source = "local"',
				'source = "local"\npinned_version = "0.0.1"',
			),
		);

		const status = await runCli(environment, ["status"]);
		expect(status.exitCode).toBe(1);
		expect(status.stderr).toContain("MALFORMED_STATE");
		expect(status.stderr).toContain("pins a version");
	});

	test("restores the installation after an interrupted rollback", async () => {
		const environment = await createEnvironment();
		await initialize(environment);
		await runCli(environment, ["update", "--pack", PACK_V2, "--yes"]);
		const before = await snapshotTree(environment.repository);

		expect(
			runRollback(["0.1.0", "--yes"], {
				cwd: environment.repository,
				userHome: environment.userHome,
				interactive: false,
				write: () => undefined,
				onExecutorEvent: (event) => {
					if (event.point === "after-operation" && event.operationIndex === 0) {
						throw new Error("Injected rollback failure");
					}
				},
			}),
		).rejects.toMatchObject({ code: "EXECUTION_FAILED" });

		expect(await snapshotTree(environment.repository)).toEqual(before);
		expect((await loadLockFile(environment.lockPath)).pack.version).toBe(
			"0.2.0",
		);
	});
});

async function initialize(environment: TestEnvironment): Promise<void> {
	const result = await runCli(environment, [
		"init",
		"--scope",
		"repository",
		"--agents",
		"claude,codex,cursor",
		"--pack",
		PACK_V1,
		"--components",
		"recommended",
		"--yes",
	]);
	expect(result.exitCode).toBe(0);
}

async function createEnvironment(): Promise<TestEnvironment> {
	const container = await mkdtemp(join(tmpdir(), "agents-pack-versions-"));
	temporaryDirectories.push(container);
	const repository = join(container, "repository");
	const userHome = join(container, "home");
	await mkdir(join(repository, ".git"), { recursive: true });
	await mkdir(userHome, { recursive: true });
	return {
		repository,
		userHome,
		configPath: join(repository, ".agents-pack/pack.toml"),
		lockPath: join(repository, ".agents-pack/lock.json"),
	};
}

async function runCli(
	environment: TestEnvironment,
	args: readonly string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	const child = Bun.spawn([process.execPath, CLI_PATH, ...args], {
		cwd: environment.repository,
		env: { ...process.env, HOME: environment.userHome },
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

async function snapshotTree(root: string): Promise<string[]> {
	const entries: string[] = [];

	async function visit(directory: string): Promise<void> {
		for (const entry of (
			await readdir(directory, { withFileTypes: true })
		).sort((left, right) =>
			left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
		)) {
			const absolute = join(directory, entry.name);
			const relative = absolute.slice(root.length + 1);

			if (entry.isDirectory()) {
				entries.push(`d:${relative}`);
				await visit(absolute);
			} else {
				entries.push(
					`f:${relative}:${Buffer.from(await readFile(absolute)).toString("base64")}`,
				);
			}
		}
	}

	await visit(root);
	return entries;
}

interface TestEnvironment {
	repository: string;
	userHome: string;
	configPath: string;
	lockPath: string;
}
