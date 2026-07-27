import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	loadLockFile,
	loadScopeConfig,
	parseLockFile,
	parseScopeConfig,
	serializeLockFile,
	serializeScopeConfig,
} from "../../src/core/state.ts";
import type { LockFile, ScopeConfig } from "../../src/core/types.ts";

const HASH = `sha256:${"a".repeat(64)}`;
const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("scope configuration", () => {
	test("parses schema version 1", () => {
		expect(parseScopeConfig(validConfigValue())).toEqual(validConfig());
	});

	test("loads TOML from disk", async () => {
		const directory = await createTemporaryDirectory();
		const path = join(directory, "pack.toml");
		await writeFile(path, serializeScopeConfig(validConfig()));

		expect(await loadScopeConfig(path)).toEqual(validConfig());
	});

	test("rejects duplicate targets and components", () => {
		expect(() =>
			parseScopeConfig({
				...validConfigValue(),
				targets: ["claude", "claude"],
			}),
		).toThrow("must not contain duplicates");
		expect(() =>
			parseScopeConfig({
				...validConfigValue(),
				components: ["ap-smoke-instructions", "ap-smoke-instructions"],
			}),
		).toThrow("must not contain duplicates");
	});

	test("serializes deterministic TOML that round-trips", () => {
		const config = validConfig();
		const bytes = serializeScopeConfig(config);

		expect(new TextDecoder().decode(bytes)).toBe(
			[
				"schema_version = 1",
				'scope = "repository"',
				'targets = ["claude", "codex"]',
				"components = [",
				'  "ap-smoke-instructions",',
				'  "agents-pack-smoke-test",',
				"]",
				"",
				"[pack]",
				'id = "agents-pack-smoke"',
				'source = "local"',
				"",
			].join("\n"),
		);
		expect(
			parseScopeConfig(Bun.TOML.parse(new TextDecoder().decode(bytes))),
		).toEqual(config);
	});
});

describe("lockfile", () => {
	test("parses components, files, and managed blocks", () => {
		const lock = parseLockFile(validLock());

		expect(lock.rendererVersion).toBe(1);
		expect(lock.components).toEqual([
			{
				id: "ap-smoke-instructions",
				kind: "instruction",
				sha256: HASH,
			},
		]);
		expect(lock.outputs).toHaveLength(2);
	});

	test("loads JSON from disk", async () => {
		const directory = await createTemporaryDirectory();
		const path = join(directory, "lock.json");
		await writeFile(path, JSON.stringify(validLock()));

		expect(await loadLockFile(path)).toMatchObject({
			schemaVersion: 1,
			rendererVersion: 1,
			pack: {
				id: "agents-pack-smoke",
				version: "0.1.0",
			},
		});
	});

	test("rejects unsafe outputs, malformed hashes, and unlocked components", () => {
		const unsafe = validLock();
		requireOutput(unsafe, 0).path = "../outside.md";
		expect(() => parseLockFile(unsafe)).toThrow("path is not safe");

		const malformed = validLock();
		malformed.pack.sha256 = "not-a-hash";
		expect(() => parseLockFile(malformed)).toThrow("must be a SHA-256 hash");

		const unlocked = validLock();
		requireOutput(unlocked, 0).componentId = "ap-other";
		expect(() => parseLockFile(unlocked)).toThrow(
			"references unlocked component",
		);
	});

	test("requires Codex managed blocks with distinct identities", () => {
		const wrongAdapter = validLock();
		requireOutput(wrongAdapter, 1).adapter = "cursor";
		expect(() => parseLockFile(wrongAdapter)).toThrow(
			"managed-block adapter must be codex",
		);

		const collision = validLock();
		requireOutput(collision, 0).path = "AGENTS.md";
		expect(() => parseLockFile(collision)).toThrow(
			"cannot share a path with a complete managed file",
		);
	});

	test("serializes deterministic JSON that round-trips", () => {
		const lock = parseLockFile(validLock());
		const serialized = serializeLockFile(lock);

		expect(new TextDecoder().decode(serialized).endsWith("\n")).toBe(true);
		expect(
			parseLockFile(JSON.parse(new TextDecoder().decode(serialized))),
		).toEqual(lock);
		expect(serializeLockFile(lock)).toEqual(serialized);
	});
});

function validConfig(): ScopeConfig {
	return {
		schemaVersion: 1,
		scope: "repository",
		targets: ["claude", "codex"],
		components: ["ap-smoke-instructions", "agents-pack-smoke-test"],
		pack: { id: "agents-pack-smoke", source: "local" },
	};
}

function validConfigValue(): Record<string, unknown> {
	return {
		schema_version: 1,
		scope: "repository",
		targets: ["claude", "codex"],
		components: ["ap-smoke-instructions", "agents-pack-smoke-test"],
		pack: { id: "agents-pack-smoke", source: "local" },
	};
}

function validLock(): LockFile {
	return {
		schemaVersion: 1,
		rendererVersion: 1,
		pack: {
			id: "agents-pack-smoke",
			version: "0.1.0",
			sha256: HASH,
			source: { kind: "local" },
		},
		components: [
			{
				id: "ap-smoke-instructions",
				kind: "instruction",
				sha256: HASH,
			},
		],
		outputs: [
			{
				componentId: "ap-smoke-instructions",
				adapter: "claude",
				kind: "file",
				path: ".claude/rules/agents-pack/ap-smoke-instructions.md",
				sha256: HASH,
			},
			{
				componentId: "ap-smoke-instructions",
				adapter: "codex",
				kind: "managed-block",
				blockId: "ap-smoke-instructions",
				path: "AGENTS.md",
				sha256: HASH,
			},
		],
	};
}

function requireOutput(
	lock: LockFile,
	index: number,
): LockFile["outputs"][number] {
	const output = lock.outputs[index];

	if (output === undefined) {
		throw new Error(`Missing lock output ${index}.`);
	}

	return output;
}

async function createTemporaryDirectory(): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), "agents-pack-state-"));
	temporaryDirectories.push(directory);
	return directory;
}
