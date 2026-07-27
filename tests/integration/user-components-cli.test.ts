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
import { runCreate } from "../../src/commands/user-components.ts";
import { loadLockFile } from "../../src/core/state.ts";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const CLI_PATH = join(PROJECT_ROOT, "src/cli/main.ts");
const PACK = join(PROJECT_ROOT, "fixtures/packs/0.1.0");
const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("user-owned component lifecycle", () => {
	test("creates, edits, synchronizes, and lists a portable skill", async () => {
		const environment = await createInitializedEnvironment();
		const created = await runCli(environment, [
			"create",
			"skill",
			"explain-incidents",
			"--description",
			"Explain production incidents. Use for incident reviews and postmortems.",
			"--yes",
		]);

		expect(created.exitCode).toBe(0);
		expect(created.stdout).toContain(
			"Created user-owned skill explain-incidents",
		);
		expect(await exists(environment.userSkill)).toBe(true);
		expect(await exists(environment.claudeSkill)).toBe(true);
		expect(await exists(environment.codexSkill)).toBe(true);
		expect(await exists(environment.cursorSkill)).toBe(false);
		expect(await loadLockFile(environment.userLockPath)).toMatchObject({
			pack: { id: "agents-pack-user", version: "local" },
			components: [{ id: "explain-incidents", kind: "skill" }],
		});

		const changed = (await readFile(environment.userSkill, "utf8")).replace(
			"Replace this scaffold with concise instructions for the reusable workflow.",
			"Trace the incident timeline and capture concrete prevention steps.",
		);
		await writeFile(environment.userSkill, changed);

		const dirtyStatus = await runCli(environment, ["status"]);
		expect(dirtyStatus.exitCode).toBe(0);
		expect(dirtyStatus.stdout).toContain(
			"User-owned canonical sources changed",
		);

		const preview = await runCli(environment, ["sync", "--dry-run"]);
		expect(preview.exitCode).toBe(0);
		expect(preview.stdout).toContain(
			"REPLACE FILE .claude/skills/explain-incidents/SKILL.md",
		);

		const synchronized = await runCli(environment, ["sync", "--yes"]);
		expect(synchronized.exitCode).toBe(0);
		expect(await readFile(environment.claudeSkill, "utf8")).toBe(changed);
		expect(await readFile(environment.codexSkill, "utf8")).toBe(changed);

		const repeated = await runCli(environment, ["sync", "--yes"]);
		expect(repeated.exitCode).toBe(0);
		expect(repeated.stdout).toContain("already synchronized");

		const listed = await runCli(environment, [
			"list",
			"--installed",
			"--kind",
			"skill",
		]);
		expect(listed.exitCode).toBe(0);
		expect(listed.stdout).toContain(
			"explain-incidents  user-owned, installed, skill",
		);
	});

	test("creates a safe subagent and forks an official skill", async () => {
		const environment = await createInitializedEnvironment();
		const subagent = await runCli(environment, [
			"create",
			"subagent",
			"release-checker",
			"--description",
			"Review release risk. Use before deployment.",
			"--yes",
		]);

		expect(subagent.exitCode).toBe(0);
		expect(
			await readFile(
				join(
					environment.repository,
					".agents-pack/user/subagents/release-checker/agent.toml",
				),
				"utf8",
			),
		).toContain('filesystem = "read-only"');
		expect(
			await exists(
				join(environment.repository, ".claude/agents/release-checker.md"),
			),
		).toBe(true);
		expect(
			await exists(
				join(environment.repository, ".codex/agents/release-checker.toml"),
			),
		).toBe(true);
		expect(
			await exists(
				join(environment.repository, ".cursor/agents/release-checker.md"),
			),
		).toBe(true);

		const forked = await runCli(environment, [
			"fork",
			"agents-pack-smoke-test",
			"--name",
			"custom-smoke-test",
			"--yes",
		]);
		expect(forked.exitCode).toBe(0);
		expect(
			await readFile(
				join(
					environment.repository,
					".agents-pack/user/skills/custom-smoke-test/SKILL.md",
				),
				"utf8",
			),
		).toContain("name: custom-smoke-test");

		const reserved = await runCli(environment, [
			"create",
			"skill",
			"ap-private-skill",
			"--description",
			"Invalid reserved name.",
			"--yes",
		]);
		expect(reserved.exitCode).toBe(2);
		expect(reserved.stderr).toContain("reserved ap- prefix");
	});

	test("eject removes generated copies but preserves canonical user sources", async () => {
		const environment = await createInitializedEnvironment();
		expect(
			(
				await runCli(environment, [
					"create",
					"skill",
					"explain-incidents",
					"--description",
					"Explain incidents. Use for postmortems.",
					"--yes",
				])
			).exitCode,
		).toBe(0);

		const ejected = await runCli(environment, ["eject", "--yes"]);
		expect(ejected.exitCode).toBe(0);
		expect(ejected.stdout).toContain(
			"User-owned canonical sources under .agents-pack/user are preserved",
		);
		expect(await exists(environment.userSkill)).toBe(true);
		expect(await exists(environment.claudeSkill)).toBe(false);
		expect(await exists(environment.codexSkill)).toBe(false);
		expect(await exists(environment.userLockPath)).toBe(false);
		expect(
			await exists(join(environment.repository, ".agents-pack/pack.toml")),
		).toBe(false);
	});

	test("rolls back interrupted user component creation byte-for-byte", async () => {
		const environment = await createInitializedEnvironment();
		const before = await snapshotTree(environment.repository);

		expect(
			runCreate(
				[
					"skill",
					"explain-incidents",
					"--description",
					"Explain incidents. Use for postmortems.",
					"--yes",
				],
				{
					cwd: environment.repository,
					userHome: environment.userHome,
					interactive: false,
					write: () => undefined,
					onExecutorEvent: (event) => {
						if (
							event.point === "after-operation" &&
							event.operationIndex === 0
						) {
							throw new Error("Injected user component failure");
						}
					},
				},
			),
		).rejects.toMatchObject({ code: "EXECUTION_FAILED" });

		expect(await snapshotTree(environment.repository)).toEqual(before);
		expect(await exists(environment.userSkill)).toBe(false);
	});
});

async function createInitializedEnvironment(): Promise<TestEnvironment> {
	const container = await mkdtemp(
		join(tmpdir(), "agents-pack-user-components-"),
	);
	temporaryDirectories.push(container);
	const repository = join(container, "repository");
	const userHome = join(container, "home");
	await mkdir(join(repository, ".git"), { recursive: true });
	await mkdir(userHome, { recursive: true });
	const environment: TestEnvironment = {
		repository,
		userHome,
		userSkill: join(
			repository,
			".agents-pack/user/skills/explain-incidents/SKILL.md",
		),
		claudeSkill: join(repository, ".claude/skills/explain-incidents/SKILL.md"),
		codexSkill: join(repository, ".agents/skills/explain-incidents/SKILL.md"),
		cursorSkill: join(repository, ".cursor/skills/explain-incidents/SKILL.md"),
		userLockPath: join(repository, ".agents-pack/user-lock.json"),
	};
	const initialized = await runCli(environment, [
		"init",
		"--scope",
		"repository",
		"--agents",
		"claude,codex,cursor",
		"--pack",
		PACK,
		"--components",
		"recommended",
		"--yes",
	]);

	expect(initialized.exitCode).toBe(0);
	return environment;
}

async function runCli(
	environment: Pick<TestEnvironment, "repository" | "userHome">,
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
	userSkill: string;
	claudeSkill: string;
	codexSkill: string;
	cursorSkill: string;
	userLockPath: string;
}
