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
import type { ScopeConfig } from "../../src/core/types.ts";

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
		expect(
			parseScopeConfig({
				schema_version: 1,
				scope: "repository",
				pack_id: "agents-pack-smoke",
				pack_version: "0.1.0",
				targets: ["claude", "codex", "cursor"],
			}),
		).toEqual({
			schemaVersion: 1,
			scope: "repository",
			packId: "agents-pack-smoke",
			packVersion: "0.1.0",
			targets: ["claude", "codex", "cursor"],
		});
	});

	test("loads TOML from disk", async () => {
		const directory = await createTemporaryDirectory();
		const path = join(directory, "pack.toml");
		await writeFile(
			path,
			`
schema_version = 1
scope = "global"
pack_id = "agents-pack-smoke"
pack_version = "0.1.0"
targets = ["claude", "codex"]
`.trimStart(),
		);

		expect(await loadScopeConfig(path)).toMatchObject({
			scope: "global",
			targets: ["claude", "codex"],
		});
	});

	test("rejects duplicate targets", () => {
		expect(() =>
			parseScopeConfig({
				schema_version: 1,
				scope: "repository",
				pack_id: "agents-pack-smoke",
				pack_version: "0.1.0",
				targets: ["claude", "claude"],
			}),
		).toThrow("must not contain duplicates");
	});

	test("serializes a deterministic TOML representation that round-trips", () => {
		const config: ScopeConfig = {
			schemaVersion: 1,
			scope: "repository",
			packId: "agents-pack-smoke",
			packVersion: "0.1.0",
			targets: ["claude", "codex"],
		};
		const bytes = serializeScopeConfig(config);

		expect(new TextDecoder().decode(bytes)).toBe(
			[
				"schema_version = 1",
				'scope = "repository"',
				'pack_id = "agents-pack-smoke"',
				'pack_version = "0.1.0"',
				'targets = ["claude", "codex"]',
				"",
			].join("\n"),
		);
		expect(
			parseScopeConfig(Bun.TOML.parse(new TextDecoder().decode(bytes))),
		).toEqual(config);
	});
});

describe("lockfile", () => {
	test("parses file and managed-block outputs", () => {
		const lock = parseLockFile(validLock());

		expect(lock.outputs).toEqual([
			{
				componentId: "instruction.smoke",
				adapter: "claude",
				kind: "file",
				path: ".claude/rules/agents-pack/smoke.md",
				sha256: HASH,
			},
			{
				componentId: "instruction.smoke",
				adapter: "codex",
				kind: "managed-block",
				blockId: "instruction.smoke",
				path: "AGENTS.md",
				sha256: HASH,
			},
		]);
	});

	test("loads JSON from disk", async () => {
		const directory = await createTemporaryDirectory();
		const path = join(directory, "lock.json");
		await writeFile(path, JSON.stringify(validLock()));

		expect(await loadLockFile(path)).toMatchObject({
			schemaVersion: 1,
			pack: {
				id: "agents-pack-smoke",
				version: "0.1.0",
			},
		});
	});

	test("rejects unsafe output paths", () => {
		const lock = validLock();
		requireOutput(lock, 0).path = "../outside.md";

		expect(() => parseLockFile(lock)).toThrow("path is not safe");
	});

	test("requires blockId for a managed block", () => {
		const lock = validLock();
		delete requireOutput(lock, 1).blockId;

		expect(() => parseLockFile(lock)).toThrow(
			"blockId must be a non-empty string",
		);
	});

	test("requires managed blocks to use the Codex adapter", () => {
		const lock = validLock();
		requireOutput(lock, 1).adapter = "cursor";

		expect(() => parseLockFile(lock)).toThrow(
			"managed-block adapter must be codex",
		);
	});

	test("rejects malformed hashes", () => {
		const lock = validLock();
		lock.pack.sha256 = "not-a-hash";

		expect(() => parseLockFile(lock)).toThrow("must be a SHA-256 hash");
	});

	test("rejects a managed block sharing a complete managed-file path", () => {
		const lock = validLock();
		requireOutput(lock, 0).path = "AGENTS.md";

		expect(() => parseLockFile(lock)).toThrow(
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

interface MutableLockOutput {
	componentId: string;
	adapter: string;
	kind: string;
	blockId?: string;
	path: string;
	sha256: string;
}

interface MutableLock {
	schemaVersion: number;
	pack: {
		id: string;
		version: string;
		sha256: string;
	};
	outputs: MutableLockOutput[];
}

function validLock(): MutableLock {
	return {
		schemaVersion: 1,
		pack: {
			id: "agents-pack-smoke",
			version: "0.1.0",
			sha256: HASH,
		},
		outputs: [
			{
				componentId: "instruction.smoke",
				adapter: "claude",
				kind: "file",
				path: ".claude/rules/agents-pack/smoke.md",
				sha256: HASH,
			},
			{
				componentId: "instruction.smoke",
				adapter: "codex",
				kind: "managed-block",
				blockId: "instruction.smoke",
				path: "AGENTS.md",
				sha256: HASH,
			},
		],
	};
}

function requireOutput(lock: MutableLock, index: number): MutableLockOutput {
	const output = lock.outputs[index];

	if (output === undefined) {
		throw new Error(`Missing test lock output at index ${index}.`);
	}

	return output;
}

async function createTemporaryDirectory(): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), "agents-pack-state-"));
	temporaryDirectories.push(directory);
	return directory;
}
