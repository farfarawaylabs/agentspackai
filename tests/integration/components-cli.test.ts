import { afterEach, describe, expect, test } from "bun:test";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { getBaseCachePath } from "../../src/core/base-cache.ts";
import { runInstall } from "../../src/commands/components.ts";
import { loadLockFile, loadScopeConfig } from "../../src/core/state.ts";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const CLI_PATH = join(PROJECT_ROOT, "src/cli/main.ts");
const PACK = join(PROJECT_ROOT, "fixtures/packs/0.1.0");
const REQUIRED = "ap-smoke-instructions";
const SKILL = "agents-pack-smoke-test";
const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("component selection lifecycle", () => {
	test("expands explicit selection, lists availability, and installs and removes idempotently", async () => {
		const environment = await createEnvironment();
		const initialized = await runCli(environment, [
			"init",
			"--scope",
			"repository",
			"--agents",
			"claude,codex",
			"--pack",
			PACK,
			"--components",
			REQUIRED,
			"--yes",
		]);

		expect(initialized.exitCode).toBe(0);
		expect((await loadScopeConfig(environment.configPath)).components).toEqual([
			REQUIRED,
		]);
		expect(await exists(environment.skillPath)).toBe(false);

		const available = await runCli(environment, [
			"list",
			"--available",
			"--kind",
			"skill",
		]);
		expect(available.exitCode).toBe(0);
		expect(available.stdout).toContain(`${SKILL}  available`);

		const installed = await runCli(environment, ["install", SKILL, "--yes"]);
		expect(installed.exitCode).toBe(0);
		expect(installed.stdout).toContain(`Installed ${SKILL}`);
		expect(await exists(environment.skillPath)).toBe(true);
		expect((await loadScopeConfig(environment.configPath)).components).toEqual([
			REQUIRED,
			SKILL,
		]);

		const repeatedInstall = await runCli(environment, [
			"install",
			SKILL,
			"--yes",
		]);
		expect(repeatedInstall.exitCode).toBe(0);
		expect(repeatedInstall.stdout).toContain("already installed");

		const dryRemove = await runCli(environment, ["remove", SKILL, "--dry-run"]);
		expect(dryRemove.exitCode).toBe(0);
		expect(await exists(environment.skillPath)).toBe(true);

		const removed = await runCli(environment, ["remove", SKILL, "--yes"]);
		expect(removed.exitCode).toBe(0);
		expect(removed.stdout).toContain(`Removed ${SKILL}`);
		expect(await exists(environment.skillPath)).toBe(false);
		expect(
			await exists(join(environment.repository, ".claude/skills", SKILL)),
		).toBe(false);
		expect((await loadScopeConfig(environment.configPath)).components).toEqual([
			REQUIRED,
		]);

		const repeatedRemove = await runCli(environment, [
			"remove",
			SKILL,
			"--yes",
		]);
		expect(repeatedRemove.exitCode).toBe(0);
		expect(repeatedRemove.stdout).toContain("already absent");

		const requiredRemoval = await runCli(environment, [
			"remove",
			REQUIRED,
			"--yes",
		]);
		expect(requiredRemoval.exitCode).toBe(1);
		expect(requiredRemoval.stderr).toContain("Required component");
	});

	test("recommended selection is explicit and update preserves it", async () => {
		const environment = await createEnvironment();
		const initialized = await runCli(environment, [
			"init",
			"--scope",
			"repository",
			"--agents",
			"claude",
			"--pack",
			PACK,
			"--components",
			"recommended",
			"--yes",
		]);

		expect(initialized.exitCode).toBe(0);
		const config = await loadScopeConfig(environment.configPath);
		const lock = await loadLockFile(environment.lockPath);
		expect(config.components).toEqual([REQUIRED, SKILL]);
		expect(lock.components.map((component) => component.id)).toEqual(
			config.components,
		);
		expect(lock.components.every((component) => isHash(component.sha256))).toBe(
			true,
		);

		const updated = await runCli(environment, [
			"update",
			"--pack",
			PACK,
			"--yes",
		]);
		expect(updated.exitCode).toBe(0);
		expect((await loadScopeConfig(environment.configPath)).components).toEqual(
			config.components,
		);
	});

	test("missing Base warns in status and blocks Base-dependent commands", async () => {
		const environment = await createEnvironment();
		expect(
			(
				await runCli(environment, [
					"init",
					"--scope",
					"repository",
					"--agents",
					"claude",
					"--pack",
					PACK,
					"--components",
					REQUIRED,
					"--yes",
				])
			).exitCode,
		).toBe(0);
		const lock = await loadLockFile(environment.lockPath);
		await rm(getBaseCachePath(environment.userHome, lock.pack.sha256));

		const status = await runCli(environment, ["status"]);
		expect(status.exitCode).toBe(0);
		expect(status.stdout).toContain("installed Base is missing");

		const install = await runCli(environment, ["install", SKILL, "--yes"]);
		expect(install.exitCode).toBe(1);
		expect(install.stderr).toContain("installed Base is unavailable");
	});

	test("dry-run does not create repository state or populate the Base cache", async () => {
		const environment = await createEnvironment();
		const result = await runCli(environment, [
			"init",
			"--scope",
			"repository",
			"--agents",
			"claude",
			"--pack",
			PACK,
			"--components",
			"recommended",
			"--dry-run",
		]);

		expect(result.exitCode).toBe(0);
		expect(await exists(join(environment.repository, ".agents-pack"))).toBe(
			false,
		);
		expect(
			await exists(join(environment.userHome, ".agents-pack/cache/packs")),
		).toBe(false);
	});

	test("rolls back an interrupted component installation byte-for-byte", async () => {
		const environment = await createEnvironment();
		expect(
			(
				await runCli(environment, [
					"init",
					"--scope",
					"repository",
					"--agents",
					"claude",
					"--pack",
					PACK,
					"--components",
					REQUIRED,
					"--yes",
				])
			).exitCode,
		).toBe(0);
		const before = await snapshotTree(environment.repository);

		expect(
			runInstall([SKILL, "--yes"], {
				cwd: environment.repository,
				userHome: environment.userHome,
				interactive: false,
				write: () => undefined,
				onExecutorEvent: (event) => {
					if (event.point === "after-operation" && event.operationIndex === 0) {
						throw new Error("Injected component failure");
					}
				},
			}),
		).rejects.toMatchObject({ code: "EXECUTION_FAILED" });

		expect(await snapshotTree(environment.repository)).toEqual(before);
		expect(await exists(environment.skillPath)).toBe(false);
	});
});

async function createEnvironment(): Promise<TestEnvironment> {
	const container = await mkdtemp(join(tmpdir(), "agents-pack-components-"));
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
		skillPath: join(
			repository,
			".claude/skills/agents-pack-smoke-test/SKILL.md",
		),
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

function isHash(value: string): boolean {
	return /^sha256:[a-f0-9]{64}$/.test(value);
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

interface TestEnvironment {
	repository: string;
	userHome: string;
	configPath: string;
	lockPath: string;
	skillPath: string;
}
