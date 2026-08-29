import { afterEach, describe, expect, test } from "bun:test";
import {
	access,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const SCRIPTS = join(
	PROJECT_ROOT,
	"content/packs/core/skills/engineering/workflows/execution/ap-subagent-driven-development/scripts",
);
const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("ap-subagent-driven-development scripts", () => {
	test("scopes workspaces by normalized plan path and content", async () => {
		const repository = await createRepository();
		const firstDirectory = join(repository, "plans/a");
		const secondDirectory = join(repository, "plans/b");
		await Promise.all([
			mkdir(firstDirectory, { recursive: true }),
			mkdir(secondDirectory, { recursive: true }),
		]);
		const firstPlan = join(firstDirectory, "plan.md");
		const secondPlan = join(secondDirectory, "plan.md");
		await Promise.all([
			writeFile(firstPlan, "# Plan\n\n## Task 1\n\nFirst.\n"),
			writeFile(secondPlan, "# Plan\n\n## Task 1\n\nFirst.\n"),
		]);

		const first = await run(
			["bash", join(SCRIPTS, "sdd-workspace"), firstPlan],
			repository,
		);
		const second = await run(
			["bash", join(SCRIPTS, "sdd-workspace"), secondPlan],
			repository,
		);

		expect(first.exitCode).toBe(0);
		expect(second.exitCode).toBe(0);
		expect(first.stdout.trim()).not.toBe(second.stdout.trim());
		expect(first.stdout).toContain(
			"/.agents-pack/runs/subagent-development/plan-",
		);

		const repeated = await run(
			["bash", join(SCRIPTS, "sdd-workspace"), firstPlan],
			repository,
		);
		expect(repeated.stdout.trim()).toBe(first.stdout.trim());

		await writeFile(firstPlan, "# Plan\n\n## Task 1\n\nChanged.\n");
		const changed = await run(
			["bash", join(SCRIPTS, "sdd-workspace"), firstPlan],
			repository,
		);
		expect(changed.stdout.trim()).not.toBe(first.stdout.trim());

		const status = await run(["git", "status", "--short"], repository);
		expect(status.stdout).not.toContain(".agents-pack/runs");
	});

	test("refuses a symlinked workspace ancestor instead of writing outside the repository", async () => {
		const repository = await createRepository();
		const outside = await mkdtemp(join(tmpdir(), "agents-pack-sdd-outside-"));
		temporaryDirectories.push(outside);
		const plan = join(repository, "plan.md");
		await writeFile(plan, "# Plan\n\n## Task 1\n\nFirst.\n");
		await symlink(outside, join(repository, ".agents-pack"));

		const result = await run(
			["bash", join(SCRIPTS, "sdd-workspace"), plan],
			repository,
		);

		expect(result.exitCode).toBe(3);
		expect(result.stderr).toContain("refusing symlinked workspace path");
		expect(await pathExists(join(outside, "runs"))).toBe(false);
	});

	test("preserves an existing conflicting workspace ignore file", async () => {
		const repository = await createRepository();
		const plan = join(repository, "plan.md");
		const base = join(repository, ".agents-pack/runs/subagent-development");
		const ignoreFile = join(base, ".gitignore");
		await writeFile(plan, "# Plan\n\n## Task 1\n\nFirst.\n");
		await mkdir(base, { recursive: true });
		await writeFile(ignoreFile, "# preserve this rule\n");

		const result = await run(
			["bash", join(SCRIPTS, "sdd-workspace"), plan],
			repository,
		);

		expect(result.exitCode).toBe(3);
		expect(result.stderr).toContain(
			"refusing to overwrite existing workspace ignore file",
		);
		expect(await readFile(ignoreFile, "utf8")).toBe("# preserve this rule\n");
	});

	test("extracts one task without swallowing later plan sections", async () => {
		const repository = await createRepository();
		const plan = join(repository, "plan.md");
		const brief = join(repository, "task-2.md");
		await writeFile(
			plan,
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
				"```md",
				"## Task 99: Example only",
				"```",
				"",
				"### Verification",
				"",
				"Run the focused test.",
				"",
				"## Appendix",
				"",
				"This is not part of Task 2.",
				"",
			].join("\n"),
		);

		const result = await run(
			["bash", join(SCRIPTS, "task-brief"), plan, "2", brief],
			repository,
		);
		const content = await readFile(brief, "utf8");

		expect(result.exitCode).toBe(0);
		expect(content).toContain("## Task 2: Second");
		expect(content).not.toContain("## Task 2a: Related subtask");
		expect(content).not.toContain("## Task 2.1: Nested numbered task");
		expect(content).not.toContain("This must not be selected for Task 2.");
		expect(content).not.toContain("This must not be selected either.");
		expect(content).toContain("## Task 99: Example only");
		expect(content).toContain("### Verification");
		expect(content).not.toContain("## Appendix");
		expect(content).not.toContain("This is not part of Task 2.");
	});

	test("packages the complete recorded commit range", async () => {
		const repository = await createRepository();
		const plan = join(repository, "plan.md");
		const source = join(repository, "feature.txt");
		const review = join(repository, "review.diff");
		await writeFile(plan, "# Plan\n\n## Task 1\n\nImplement feature.\n");
		await writeFile(source, "zero\n");
		await run(["git", "add", "plan.md", "feature.txt"], repository);
		await run(["git", "commit", "-m", "baseline"], repository);
		const base = (
			await run(["git", "rev-parse", "HEAD"], repository)
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
			["bash", join(SCRIPTS, "review-package"), plan, base, head, review],
			repository,
		);
		const content = await readFile(review, "utf8");

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("2 commit(s)");
		expect(content).toContain("first task commit");
		expect(content).toContain("second task commit");
		expect(content).toContain("+one");
		expect(content).toContain("+two");

		const reversed = await run(
			["bash", join(SCRIPTS, "review-package"), plan, head, base, review],
			repository,
		);
		expect(reversed.exitCode).toBe(3);
		expect(reversed.stderr).toContain("BASE is not an ancestor of HEAD");
	});
});

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function createRepository(): Promise<string> {
	const repository = await mkdtemp(join(tmpdir(), "agents-pack-sdd-"));
	temporaryDirectories.push(repository);
	await run(["git", "init", "-q", "-b", "feature"], repository);
	await run(["git", "config", "user.email", "tests@example.com"], repository);
	await run(["git", "config", "user.name", "Agents Pack Tests"], repository);
	return repository;
}

async function run(
	command: string[],
	cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	const child = Bun.spawn(command, {
		cwd,
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
