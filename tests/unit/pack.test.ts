import { afterEach, describe, expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { AgentsPackError } from "../../src/core/errors.ts";
import { loadPack, loadPackManifest } from "../../src/core/pack.ts";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("loadPackManifest", () => {
	test("loads fixture pack 0.1.0", async () => {
		const manifest = await loadPackManifest(
			join(PROJECT_ROOT, "fixtures/packs/0.1.0"),
		);

		expect(manifest).toEqual({
			schemaVersion: 1,
			id: "agents-pack-smoke",
			version: "0.1.0",
			components: [
				{
					id: "instruction.smoke",
					kind: "instruction",
					source: "instructions/smoke.md",
					targets: ["claude", "codex", "cursor"],
				},
				{
					id: "skill.smoke",
					kind: "skill",
					source: "skills/agents-pack-smoke-test",
					targets: ["claude", "codex", "cursor"],
				},
			],
		});
	});

	test("rejects an unsupported schema version", async () => {
		const packRoot = await createTemporaryPack(`
schema_version = 2
id = "invalid"
version = "1.0.0"
components = []
`);

		expect(loadPackManifest(packRoot)).rejects.toMatchObject({
			name: "AgentsPackError",
			code: "INVALID_PACK",
		});
	});

	test("rejects a component source traversal", async () => {
		const packRoot = await createTemporaryPack(`
schema_version = 1
id = "invalid"
version = "1.0.0"

[[components]]
id = "instruction.invalid"
kind = "instruction"
source = "../outside.md"
targets = ["claude"]
`);

		expect(loadPackManifest(packRoot)).rejects.toMatchObject({
			code: "INVALID_PACK",
		});
	});

	test("rejects an unsupported target", async () => {
		const packRoot = await createTemporaryPack(`
schema_version = 1
id = "invalid"
version = "1.0.0"

[[components]]
id = "instruction.invalid"
kind = "instruction"
source = "instruction.md"
targets = ["unknown"]
`);

		try {
			await loadPackManifest(packRoot);
			throw new Error("Expected loadPackManifest to reject the target.");
		} catch (error) {
			expect(error).toBeInstanceOf(AgentsPackError);
			expect((error as AgentsPackError).code).toBe("INVALID_PACK");
			expect((error as Error).message).toContain("not a supported agent");
		}
	});
});

describe("loadPack", () => {
	test("loads and hashes all files in fixture pack 0.1.0", async () => {
		const pack = await loadPack(join(PROJECT_ROOT, "fixtures/packs/0.1.0"));

		expect(pack.manifest.version).toBe("0.1.0");
		expect(pack.files.map((file) => file.path)).toEqual([
			"instructions/smoke.md",
			"pack.toml",
			"skills/agents-pack-smoke-test/SKILL.md",
		]);
		expect(pack.files.every((file) => isSha256(file.sha256))).toBe(true);
		expect(isSha256(pack.sha256)).toBe(true);
	});

	test("produces the same hash from the same files at a different root", async () => {
		const originalRoot = join(PROJECT_ROOT, "fixtures/packs/0.1.0");
		const parent = await createTemporaryDirectory();
		const copiedRoot = join(parent, "copied-pack");
		await cp(originalRoot, copiedRoot, { recursive: true });

		const [original, copied] = await Promise.all([
			loadPack(originalRoot),
			loadPack(copiedRoot),
		]);

		expect(copied.sha256).toBe(original.sha256);
	});

	test("changes the hash when pack content changes", async () => {
		const [versionOne, versionTwo] = await Promise.all([
			loadPack(join(PROJECT_ROOT, "fixtures/packs/0.1.0")),
			loadPack(join(PROJECT_ROOT, "fixtures/packs/0.2.0")),
		]);

		expect(versionTwo.sha256).not.toBe(versionOne.sha256);
	});

	test("rejects a missing component source", async () => {
		const root = await createTemporaryPack(validManifest());
		await mkdir(join(root, "skills/agents-pack-smoke-test"), {
			recursive: true,
		});
		await writeFile(
			join(root, "skills/agents-pack-smoke-test/SKILL.md"),
			"skill",
		);

		expect(loadPack(root)).rejects.toMatchObject({
			code: "INVALID_PACK",
		});
	});

	test("rejects a pack symlink that escapes the pack root", async () => {
		const root = await createValidTemporaryPack();
		const outside = await createTemporaryDirectory();
		const outsideInstruction = join(outside, "outside.md");
		await writeFile(outsideInstruction, "outside");
		await rm(join(root, "instructions/smoke.md"));
		await symlink(outsideInstruction, join(root, "instructions/smoke.md"));

		expect(loadPack(root)).rejects.toMatchObject({
			code: "INVALID_PACK",
		});
	});
});

async function createValidTemporaryPack(): Promise<string> {
	const root = await createTemporaryPack(validManifest());
	await mkdir(join(root, "instructions"), { recursive: true });
	await mkdir(join(root, "skills/agents-pack-smoke-test"), {
		recursive: true,
	});
	await writeFile(join(root, "instructions/smoke.md"), "instruction");
	await writeFile(
		join(root, "skills/agents-pack-smoke-test/SKILL.md"),
		"skill",
	);
	return root;
}

async function createTemporaryPack(manifest: string): Promise<string> {
	const directory = await createTemporaryDirectory();
	await writeFile(join(directory, "pack.toml"), manifest.trimStart(), "utf8");
	return directory;
}

async function createTemporaryDirectory(): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), "agents-pack-pack-"));
	temporaryDirectories.push(directory);
	return directory;
}

function validManifest(): string {
	return `
schema_version = 1
id = "agents-pack-smoke"
version = "0.1.0"

[[components]]
id = "instruction.smoke"
kind = "instruction"
source = "instructions/smoke.md"
targets = ["claude", "codex", "cursor"]

[[components]]
id = "skill.smoke"
kind = "skill"
source = "skills/agents-pack-smoke-test"
targets = ["claude", "codex", "cursor"]
`;
}

function isSha256(value: string): boolean {
	return /^sha256:[a-f0-9]{64}$/.test(value);
}
