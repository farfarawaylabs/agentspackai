import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { AgentsPackError } from "../../src/core/errors.ts";
import {
	createPathContext,
	findRepositoryRoot,
	resolveContainedPath,
	resolveScopePaths,
	validatePortableRelativePath,
} from "../../src/core/paths.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("createPathContext", () => {
	test("normalizes the working directory and injected user home", () => {
		const context = createPathContext({
			cwd: "./workspace",
			userHome: "./temporary-home",
		});

		expect(context).toEqual({
			cwd: resolve("./workspace"),
			userHome: resolve("./temporary-home"),
		});
	});

	test("rejects an empty working directory", () => {
		expect(() =>
			createPathContext({ cwd: " ", userHome: "/tmp/test-home" }),
		).toThrow(AgentsPackError);
	});

	test("rejects an empty user home", () => {
		expect(() =>
			createPathContext({ cwd: "/tmp/test-workspace", userHome: "" }),
		).toThrow("The user home cannot be empty.");
	});
});

describe("validatePortableRelativePath", () => {
	test("accepts a normalized portable path", () => {
		expect(validatePortableRelativePath(".claude/rules/smoke.md")).toBe(
			".claude/rules/smoke.md",
		);
	});

	for (const invalid of [
		"../outside.md",
		"inside/../outside.md",
		"/absolute.md",
		"C:\\absolute.md",
		"double//separator.md",
		"./relative.md",
	]) {
		test(`rejects ${invalid}`, () => {
			expect(() => validatePortableRelativePath(invalid)).toThrow(
				AgentsPackError,
			);
		});
	}
});

describe("findRepositoryRoot", () => {
	test("returns the nearest Git root", async () => {
		const outer = await createTemporaryDirectory();
		const repository = join(outer, "repository");
		const nested = join(repository, "apps/web");
		await mkdir(join(repository, ".git"), { recursive: true });
		await mkdir(nested, { recursive: true });

		expect(await findRepositoryRoot(nested)).toBe(repository);
	});

	test("accepts a Git worktree marker file", async () => {
		const repository = await createTemporaryDirectory();
		const nested = join(repository, "src");
		await writeFile(join(repository, ".git"), "gitdir: elsewhere\n");
		await mkdir(nested);

		expect(await findRepositoryRoot(nested)).toBe(repository);
	});

	test("uses the current folder when no Git root exists", async () => {
		const directory = await createTemporaryDirectory();
		const nested = join(directory, "nested");
		await mkdir(nested);

		expect(await findRepositoryRoot(nested)).toBe(nested);
	});
});

describe("resolveScopePaths", () => {
	test("resolves repository state from the nearest Git root", async () => {
		const userHome = await createTemporaryDirectory();
		const repository = await createTemporaryDirectory();
		const nested = join(repository, "src");
		await mkdir(join(repository, ".git"));
		await mkdir(nested);

		const paths = await resolveScopePaths("repository", {
			cwd: nested,
			userHome,
		});

		expect(paths).toEqual({
			scope: "repository",
			root: repository,
			stateDirectory: join(repository, ".agents-pack"),
			configPath: join(repository, ".agents-pack/pack.toml"),
			lockPath: join(repository, ".agents-pack/lock.json"),
			operationLockPath: join(repository, ".agents-pack.operation.lock"),
			transactionsDirectory: join(repository, ".agents-pack/transactions"),
		});
	});

	test("keeps all global state under the injected user home", async () => {
		const userHome = await createTemporaryDirectory();
		const cwd = await createTemporaryDirectory();

		const paths = await resolveScopePaths("global", { cwd, userHome });

		expect(paths.root).toBe(userHome);
		expect(paths.configPath).toBe(join(userHome, ".agents-pack/config.toml"));
		expect(paths.lockPath.startsWith(userHome)).toBe(true);
		expect(paths.operationLockPath.startsWith(userHome)).toBe(true);
	});
});

describe("resolveContainedPath", () => {
	test("resolves a missing descendant inside the root", async () => {
		const root = await createTemporaryDirectory();

		expect(await resolveContainedPath(root, ".claude/rules/smoke.md")).toBe(
			join(root, ".claude/rules/smoke.md"),
		);
	});

	test("rejects traversal before touching the filesystem", async () => {
		const root = await createTemporaryDirectory();

		expect(resolveContainedPath(root, "../outside.md")).rejects.toMatchObject({
			code: "INVALID_PATH",
		});
	});

	test("rejects an ancestor symlink that leaves the root", async () => {
		const root = await createTemporaryDirectory();
		const outside = await createTemporaryDirectory();
		await symlink(outside, join(root, "linked"));

		expect(
			resolveContainedPath(root, "linked/output.md"),
		).rejects.toMatchObject({
			code: "INVALID_PATH",
		});
	});

	test("rejects a final managed symlink even when it stays inside", async () => {
		const root = await createTemporaryDirectory();
		await writeFile(join(root, "real.md"), "content");
		await symlink("real.md", join(root, "managed.md"));

		expect(
			resolveContainedPath(root, "managed.md", {
				rejectFinalSymlink: true,
			}),
		).rejects.toMatchObject({
			code: "OWNERSHIP_CONFLICT",
		});
	});

	test("rejects a missing descendant beneath an existing file", async () => {
		const root = await createTemporaryDirectory();
		await writeFile(join(root, "file"), "content");

		expect(resolveContainedPath(root, "file/output.md")).rejects.toMatchObject({
			code: "INVALID_PATH",
		});
	});

	test("allows an internal source symlink when final symlinks are permitted", async () => {
		const root = await createTemporaryDirectory();
		await writeFile(join(root, "real.md"), "content");
		await symlink("real.md", join(root, "source.md"));

		expect(await resolveContainedPath(root, "source.md")).toBe(
			join(root, "source.md"),
		);
	});
});

async function createTemporaryDirectory(): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), "agents-pack-paths-"));
	temporaryDirectories.push(directory);
	return directory;
}
