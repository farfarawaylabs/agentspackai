import { afterEach, describe, expect, test } from "bun:test";
import {
	access,
	chmod,
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	realpath,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const SCRIPTS = join(
	PROJECT_ROOT,
	"content/packs/core/skills/engineering/dev-flow/ap-dev-implement/scripts",
);
const WORKSPACE = join(SCRIPTS, "dev-run-workspace");
const FLOW_ID = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*-[0-9a-f]{6}$/;
const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("ap-dev-implement dev-run-workspace", () => {
	test("creates a fresh ignored run folder with filled meta and status files", async () => {
		const repository = await createRepository();
		const root = await realpath(repository);

		const first = await run(
			["bash", WORKSPACE, "new", "Login Fix!"],
			repository,
		);
		const second = await run(
			["bash", WORKSPACE, "new", "Login Fix!"],
			repository,
		);

		expect(first.exitCode).toBe(0);
		const runPath = first.stdout.trim();
		const flowId = basename(runPath);
		expect(runPath).toBe(join(root, ".agents-pack/runs", flowId));
		expect(flowId).toMatch(FLOW_ID);
		expect(flowId).toContain("-login-fix-");
		expect(second.stdout.trim()).not.toBe(runPath);

		expect(
			await readFile(join(root, ".agents-pack/runs/.gitignore"), "utf8"),
		).toBe("*\n");
		const meta = await readFile(join(runPath, "meta.yaml"), "utf8");
		expect(meta).toContain(`flow_id: '${flowId}'`);
		expect(meta).toContain(`worktree: '${root}'`);
		expect(meta).toContain("branch: 'feature'");
		expect(meta).toMatch(/created_at: '\d{4}-\d{2}-\d{2}T[\d:]+Z'/);
		expect(meta).not.toContain("{{");
		const status = await readFile(join(runPath, "STATUS.md"), "utf8");
		expect(status).toContain(`- run: ${runPath}`);
		expect(status).toContain(`- worktree: ${root}`);
		expect(status).not.toContain("{{");

		const gitStatus = await run(
			["git", "status", "--short", "--untracked-files=all"],
			repository,
		);
		expect(gitStatus.stdout).not.toContain(".agents-pack/runs");
	});

	test("defaults to interactive mode and its caps", async () => {
		const repository = await createRepository();

		const created = await run(["bash", WORKSPACE, "new", "caps"], repository);

		expect(created.exitCode).toBe(0);
		const meta = await readFile(
			join(created.stdout.trim(), "meta.yaml"),
			"utf8",
		);
		expect(meta).toContain("mode: 'interactive'");
		expect(meta).toContain("plan_review_max: 2");
		expect(meta).toContain("task_repair_max: 5");
		expect(meta).toContain("integration_review_max: 2");
		expect(meta).toContain("verify_repair_max: 2");
	});

	test("records auto mode and its raised caps", async () => {
		const repository = await createRepository();

		const created = await run(
			["bash", WORKSPACE, "new", "caps", "auto"],
			repository,
		);

		expect(created.exitCode).toBe(0);
		const meta = await readFile(
			join(created.stdout.trim(), "meta.yaml"),
			"utf8",
		);
		expect(meta).toContain("mode: 'auto'");
		expect(meta).toContain("plan_review_max: 4");
		expect(meta).toContain("integration_review_max: 4");
		expect(meta).toContain("verify_repair_max: 4");
		// The task repair ladder stays at five rounds in both modes.
		expect(meta).toContain("task_repair_max: 5");
		expect(meta).not.toContain("{{");
	});

	test("rejects an unknown mode and a mode on other commands", async () => {
		const repository = await createRepository();
		const created = await run(
			["bash", WORKSPACE, "new", "caps", "auto"],
			repository,
		);
		const flowId = basename(created.stdout.trim());

		const badMode = await run(
			["bash", WORKSPACE, "new", "caps", "turbo"],
			repository,
		);
		expect(badMode.exitCode).toBe(2);
		expect(badMode.stderr).toContain("mode must be interactive or auto");

		const extraArgument = await run(
			["bash", WORKSPACE, "resolve", flowId, "auto"],
			repository,
		);
		expect(extraArgument.exitCode).toBe(2);
		expect(extraArgument.stderr).toContain("usage:");
	});

	test("never reuses an existing run folder", async () => {
		const repository = await createRepository();
		const bin = await fixedRandomBin();
		const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };

		const first = await run(
			["bash", WORKSPACE, "new", "same"],
			repository,
			env,
		);
		const second = await run(
			["bash", WORKSPACE, "new", "same"],
			repository,
			env,
		);

		expect(first.exitCode).toBe(0);
		expect(basename(first.stdout.trim())).toBe("2026-01-02-same-abcdef");
		expect(second.exitCode).toBe(3);
		expect(second.stderr).toContain("refusing to reuse existing run");
	});

	test("escapes single quotes in YAML values", async () => {
		const container = await mkdtemp(join(tmpdir(), "agents-pack-dev-run-"));
		temporaryDirectories.push(container);
		const repository = join(container, "it's here");
		await mkdir(repository);
		await initRepository(repository);

		const result = await run(["bash", WORKSPACE, "new", "quote"], repository);
		const meta = await readFile(
			join(result.stdout.trim(), "meta.yaml"),
			"utf8",
		);

		expect(meta).toContain("it''s here'");
	});

	test("rejects slugs and flow ids that cannot form a safe run name", async () => {
		const repository = await createRepository();

		const emptySlug = await run(["bash", WORKSPACE, "new", "!!!"], repository);
		expect(emptySlug.exitCode).toBe(2);

		for (const id of ["../outside", "2026-01-02-x", "runs", ""]) {
			for (const command of ["resolve", "remove"]) {
				const result = await run(["bash", WORKSPACE, command, id], repository);
				expect(result.exitCode).not.toBe(0);
			}
		}
		const invalid = await run(
			["bash", WORKSPACE, "resolve", "not a flow id"],
			repository,
		);
		expect(invalid.exitCode).toBe(2);
		expect(invalid.stderr).toContain("invalid flow id");
	});

	test("resolves a run by flow id or path only inside this worktree's run root", async () => {
		const repository = await createRepository();
		const created = (
			await run(["bash", WORKSPACE, "new", "resolve"], repository)
		).stdout.trim();

		const byId = await run(
			["bash", WORKSPACE, "resolve", basename(created)],
			repository,
		);
		const byPath = await run(
			["bash", WORKSPACE, "resolve", created],
			repository,
		);
		expect(byId.stdout.trim()).toBe(created);
		expect(byPath.stdout.trim()).toBe(created);

		const other = await createRepository();
		const outside = join(other, ".agents-pack/runs", basename(created));
		await mkdir(outside, { recursive: true });
		const foreign = await run(
			["bash", WORKSPACE, "resolve", outside],
			repository,
		);
		expect(foreign.exitCode).toBe(3);
		expect(foreign.stderr).toContain("not in this worktree's run root");
	});

	test("refuses a symlinked ancestor instead of writing outside the repository", async () => {
		const repository = await createRepository();
		const outside = await mkdtemp(join(tmpdir(), "agents-pack-dev-run-out-"));
		temporaryDirectories.push(outside);
		await symlink(outside, join(repository, ".agents-pack"));

		const result = await run(["bash", WORKSPACE, "new", "escape"], repository);

		expect(result.exitCode).toBe(3);
		expect(result.stderr).toContain("refusing symlinked run path");
		expect(await pathExists(join(outside, "runs"))).toBe(false);
	});

	test("preserves an existing conflicting run ignore file", async () => {
		const repository = await createRepository();
		const runs = join(repository, ".agents-pack/runs");
		await mkdir(runs, { recursive: true });
		await writeFile(join(runs, ".gitignore"), "# preserve this rule\n");

		const result = await run(["bash", WORKSPACE, "new", "ignore"], repository);

		expect(result.exitCode).toBe(3);
		expect(result.stderr).toContain(
			"refusing to overwrite existing run ignore file",
		);
		expect(await readFile(join(runs, ".gitignore"), "utf8")).toBe(
			"# preserve this rule\n",
		);
		expect(await readdir(runs)).toEqual([".gitignore"]);
	});

	test("removes only the named run and never follows a symlinked run", async () => {
		const repository = await createRepository();
		const keep = (
			await run(["bash", WORKSPACE, "new", "keep"], repository)
		).stdout.trim();
		const drop = (
			await run(["bash", WORKSPACE, "new", "drop"], repository)
		).stdout.trim();

		const removed = await run(
			["bash", WORKSPACE, "remove", basename(drop)],
			repository,
		);
		expect(removed.exitCode).toBe(0);
		expect(await pathExists(drop)).toBe(false);
		expect(await pathExists(join(keep, "meta.yaml"))).toBe(true);
		expect(
			await pathExists(join(repository, ".agents-pack/runs/.gitignore")),
		).toBe(true);

		const outside = await mkdtemp(join(tmpdir(), "agents-pack-dev-run-out-"));
		temporaryDirectories.push(outside);
		await writeFile(join(outside, "precious.txt"), "keep me\n");
		const linkedId = "2026-01-02-linked-abcd";
		await symlink(outside, join(repository, ".agents-pack/runs", linkedId));

		const refused = await run(
			["bash", WORKSPACE, "remove", linkedId],
			repository,
		);
		expect(refused.exitCode).toBe(3);
		expect(refused.stderr).toContain("refusing symlinked run path");
		expect(await readFile(join(outside, "precious.txt"), "utf8")).toBe(
			"keep me\n",
		);
	});
	test("remove refuses a symlinked ancestor and leaves the outside tree intact", async () => {
		const repository = await createRepository();
		const outside = await mkdtemp(join(tmpdir(), "agents-pack-dev-run-out-"));
		temporaryDirectories.push(outside);
		const flowId = "2026-01-02-outside-abcd";
		await mkdir(join(outside, "runs", flowId), { recursive: true });
		await writeFile(join(outside, "runs", flowId, "keep.txt"), "keep\n");
		await symlink(outside, join(repository, ".agents-pack"));

		const result = await run(["bash", WORKSPACE, "remove", flowId], repository);

		expect(result.exitCode).toBe(3);
		expect(
			await readFile(join(outside, "runs", flowId, "keep.txt"), "utf8"),
		).toBe("keep\n");
	});

	test("keeps backslashes and ampersands literal in filled templates", async () => {
		const container = await mkdtemp(join(tmpdir(), "agents-pack-dev-run-"));
		temporaryDirectories.push(container);
		const repository = join(container, "a&b\\c");
		await mkdir(repository);
		await initRepository(repository);
		// Resolve only the parent: Bun's realpath treats a backslash as a separator.
		const root = join(await realpath(container), "a&b\\c");

		const result = await run(["bash", WORKSPACE, "new", "odd"], repository);

		expect(result.exitCode).toBe(0);
		expect(
			await readFile(join(result.stdout.trim(), "STATUS.md"), "utf8"),
		).toContain(`- worktree: ${root}\n`);
	});

	test("refuses a symlinked tasks folder", async () => {
		const repository = await createRepository();
		const runPath = (
			await run(["bash", WORKSPACE, "new", "tasks"], repository)
		).stdout.trim();
		await writeFile(join(runPath, "02-plan.md"), "### Task 1 — One\n");
		const outside = await mkdtemp(join(tmpdir(), "agents-pack-dev-run-out-"));
		temporaryDirectories.push(outside);
		await symlink(outside, join(runPath, "tasks"));

		const result = await run(
			["bash", join(SCRIPTS, "task-brief"), runPath, "1"],
			repository,
		);

		expect(result.exitCode).toBe(3);
		expect(await readdir(outside)).toEqual([]);
	});
});

describe("ap-dev-implement task-brief", () => {
	test("extracts one dev-flow template task without swallowing later sections", async () => {
		const repository = await createRepository();
		const runPath = (
			await run(["bash", WORKSPACE, "new", "brief"], repository)
		).stdout.trim();
		await writeFile(
			join(runPath, "02-plan.md"),
			[
				"# Plan",
				"",
				"## Phase 1 — Setup",
				"",
				"**Phase verify:** `bun test`",
				"",
				"### Task 1 — First",
				"",
				"- phase: 1",
				"- verify: `bun test first`",
				"",
				"## Phase 2 — Build",
				"",
				"### Task 3 — Third",
				"",
				"- phase: 2",
				"- parallel: after:[1]",
				"- intent: Build the third thing.",
				"- verify: `bun test third`",
				"",
				"```md",
				"### Task 99 — Example only",
				"```",
				"",
				"#### Notes",
				"",
				"Keep this with Task 3.",
				"",
				"### Task 30 — Thirtieth",
				"",
				"This must not be selected for Task 3.",
				"",
				"## Acceptance commands",
				"",
				"- [ ] `bun run check`",
				"",
			].join("\n"),
		);

		const result = await run(
			["bash", join(SCRIPTS, "task-brief"), basename(runPath), "3"],
			repository,
		);
		const content = await readFile(
			join(runPath, "tasks/task-3-brief.md"),
			"utf8",
		);

		expect(result.exitCode).toBe(0);
		expect(content.split("\n")[0]).toBe("### Task 3 — Third");
		expect(content).toContain("- intent: Build the third thing.");
		expect(content).toContain("### Task 99 — Example only");
		expect(content).toContain("Keep this with Task 3.");
		expect(content).not.toContain("Task 30");
		expect(content).not.toContain("Task 1 — First");
		expect(content).not.toContain("Acceptance commands");

		const missing = await run(
			["bash", join(SCRIPTS, "task-brief"), runPath, "7"],
			repository,
		);
		expect(missing.exitCode).toBe(3);
		expect(missing.stderr).toContain("### Task 7 — Title");
	});

	test("supports the older heading styles", async () => {
		const repository = await createRepository();
		const runPath = (
			await run(["bash", WORKSPACE, "new", "legacy"], repository)
		).stdout.trim();
		const brief = join(repository, "task-2.md");
		await writeFile(
			join(runPath, "02-plan.md"),
			[
				"# Implementation Plan",
				"",
				"## Task 1: First",
				"",
				"First task.",
				"",
				"## Task 2a: Related subtask",
				"",
				"This must not be selected for Task 2.",
				"",
				"## Task 2.1: Nested numbered task",
				"",
				"This must not be selected either.",
				"",
				"## Task 2: Second",
				"",
				"Second task.",
				"",
				"## Appendix",
				"",
				"This is not part of Task 2.",
				"",
			].join("\n"),
		);

		const result = await run(
			["bash", join(SCRIPTS, "task-brief"), runPath, "2", brief],
			repository,
		);
		const content = await readFile(brief, "utf8");

		expect(result.exitCode).toBe(0);
		expect(content).toContain("## Task 2: Second");
		expect(content).not.toContain("This must not be selected");
		expect(content).not.toContain("## Appendix");
	});
});

describe("ap-dev-implement review-package", () => {
	test("packages the complete recorded commit range into the run", async () => {
		const repository = await createRepository();
		const source = join(repository, "feature.txt");
		await writeFile(source, "zero\n");
		await run(["git", "add", "feature.txt"], repository);
		await run(["git", "commit", "-m", "baseline"], repository);
		const base = (
			await run(["git", "rev-parse", "HEAD"], repository)
		).stdout.trim();
		const runPath = (
			await run(["bash", WORKSPACE, "new", "package"], repository)
		).stdout.trim();

		await writeFile(source, "zero\none\n");
		await run(["git", "add", "feature.txt"], repository);
		await run(["git", "commit", "-m", "first task commit"], repository);
		await writeFile(source, "zero\none\ntwo\n");
		await run(["git", "add", "feature.txt"], repository);
		await run(["git", "commit", "-m", "second task commit"], repository);
		const head = (
			await run(["git", "rev-parse", "HEAD"], repository)
		).stdout.trim();

		const result = await run(
			["bash", join(SCRIPTS, "review-package"), runPath, base, head],
			repository,
		);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("2 commit(s)");
		const [packageFile] = (await readdir(join(runPath, "tasks"))).filter(
			(name) => name.startsWith("package-"),
		);
		expect(packageFile).toBe(
			`package-${base.slice(0, 7)}..${head.slice(0, 7)}.diff`,
		);
		const content = await readFile(
			join(runPath, "tasks", packageFile ?? ""),
			"utf8",
		);
		expect(content).toContain("first task commit");
		expect(content).toContain("second task commit");
		expect(content).toContain("+one");
		expect(content).toContain("+two");

		const reversed = await run(
			["bash", join(SCRIPTS, "review-package"), runPath, head, base],
			repository,
		);
		expect(reversed.exitCode).toBe(3);
		expect(reversed.stderr).toContain("BASE is not an ancestor of HEAD");

		const standalone = join(repository, "standalone.diff");
		const withoutRun = await run(
			["bash", join(SCRIPTS, "review-package"), "-", base, head, standalone],
			repository,
		);
		expect(withoutRun.exitCode).toBe(0);
		expect(await readFile(standalone, "utf8")).toContain("+two");

		for (const args of [
			["-", base, head],
			["not-a-run", base, head],
		]) {
			const invalid = await run(
				["bash", join(SCRIPTS, "review-package"), ...args],
				repository,
			);
			expect(invalid.exitCode).toBe(2);
		}
	});
});

async function fixedRandomBin(): Promise<string> {
	const bin = await mkdtemp(join(tmpdir(), "agents-pack-dev-run-bin-"));
	temporaryDirectories.push(bin);
	const scripts: Record<string, string> = {
		od: "#!/bin/sh\necho ' ab cd ef'\n",
		date: `#!/bin/sh\ncase "$*" in *%Y-%m-%d) echo 2026-01-02 ;; *) echo 2026-01-02T00:00:00Z ;; esac\n`,
	};
	for (const [name, body] of Object.entries(scripts)) {
		await writeFile(join(bin, name), body);
		await chmod(join(bin, name), 0o755);
	}
	return bin;
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function createRepository(): Promise<string> {
	const repository = await mkdtemp(join(tmpdir(), "agents-pack-dev-run-"));
	temporaryDirectories.push(repository);
	await initRepository(repository);
	return repository;
}

async function initRepository(repository: string): Promise<void> {
	await run(["git", "init", "-q", "-b", "feature"], repository);
	await run(["git", "config", "user.email", "tests@example.com"], repository);
	await run(["git", "config", "user.name", "Agents Pack Tests"], repository);
}

async function run(
	command: string[],
	cwd: string,
	env?: Record<string, string | undefined>,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	const child = Bun.spawn(command, {
		cwd,
		env,
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
