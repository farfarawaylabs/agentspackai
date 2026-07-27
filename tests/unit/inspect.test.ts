import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { hashBytes } from "../../src/core/hash.ts";
import {
	inspectDesiredDestination,
	inspectLockedOutputs,
} from "../../src/core/inspect.ts";
import type {
	DesiredOutput,
	LockFile,
	LockedOutput,
} from "../../src/core/types.ts";
import {
	findManagedBlock,
	insertManagedBlock,
	renderManagedBlock,
} from "../../src/filesystem/managed-block.ts";

const encoder = new TextEncoder();
const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("inspectLockedOutputs", () => {
	test("classifies absent, clean, and modified complete files", async () => {
		const root = await createTemporaryDirectory();
		const bytes = encoder.encode("managed\n");
		const output: LockedOutput = {
			kind: "file",
			componentId: "instruction.smoke",
			adapter: "claude",
			path: ".claude/rules/agents-pack/smoke.md",
			sha256: hashBytes(bytes),
		};
		const lock = lockWith(output);

		expect(await statuses(root, lock)).toEqual(["missing"]);

		await write(root, output.path, bytes);
		expect(await statuses(root, lock)).toEqual(["clean"]);

		await write(root, output.path, encoder.encode("user edit\n"));
		expect(await statuses(root, lock)).toEqual(["modified"]);
	});

	test("hashes only the owned managed-block segment", async () => {
		const root = await createTemporaryDirectory();
		const rendered = renderManagedBlock(
			"instruction.smoke",
			"0.1.0",
			encoder.encode("managed\n"),
		);
		const shared = insertManagedBlock(
			encoder.encode("# User instructions\n"),
			rendered,
		);
		const block = findManagedBlock(shared);

		expect(block).toBeDefined();
		const output: LockedOutput = {
			kind: "managed-block",
			componentId: "instruction.smoke",
			adapter: "codex",
			path: "AGENTS.md",
			blockId: "instruction.smoke",
			sha256: hashBytes(block?.ownedBytes ?? new Uint8Array()),
		};
		await write(root, output.path, shared);

		expect(await statuses(root, lockWith(output))).toEqual(["clean"]);

		await write(
			root,
			output.path,
			encoder.encode(
				`${new TextDecoder().decode(shared)}\nUser text after block.\n`,
			),
		);
		expect(await statuses(root, lockWith(output))).toEqual(["clean"]);
	});

	test("classifies missing, modified, and malformed managed blocks", async () => {
		const root = await createTemporaryDirectory();
		const rendered = renderManagedBlock(
			"instruction.smoke",
			"0.1.0",
			encoder.encode("managed\n"),
		);
		const output: LockedOutput = {
			kind: "managed-block",
			componentId: "instruction.smoke",
			adapter: "codex",
			path: "AGENTS.md",
			blockId: "instruction.smoke",
			sha256: hashBytes(rendered),
		};
		const lock = lockWith(output);

		await write(root, output.path, encoder.encode("# User only\n"));
		expect(await statuses(root, lock)).toEqual(["missing"]);

		await write(
			root,
			output.path,
			renderManagedBlock(
				"instruction.smoke",
				"0.1.0",
				encoder.encode("edited\n"),
			),
		);
		expect(await statuses(root, lock)).toEqual(["modified"]);

		await write(
			root,
			output.path,
			encoder.encode(
				"<!-- agents-pack:start id=instruction.smoke version=0.1.0 -->\n",
			),
		);
		expect(await statuses(root, lock)).toEqual(["malformed"]);
	});

	test("rejects lockfile paths outside adapter-owned roots", async () => {
		const root = await createTemporaryDirectory();
		const output: LockedOutput = {
			kind: "file",
			componentId: "instruction.smoke",
			adapter: "claude",
			path: "README.md",
			sha256: hashBytes(encoder.encode("content")),
		};

		expect(
			inspectLockedOutputs(root, "repository", lockWith(output)),
		).rejects.toMatchObject({ code: "MALFORMED_STATE" });
	});
});

describe("inspectDesiredDestination", () => {
	const managedFile: DesiredOutput = {
		kind: "file",
		componentId: "instruction.smoke",
		adapter: "claude",
		path: ".claude/rules/agents-pack/smoke.md",
		bytes: encoder.encode("managed\n"),
	};
	const managedBlock: DesiredOutput = {
		kind: "managed-block",
		componentId: "instruction.smoke",
		adapter: "codex",
		path: "AGENTS.md",
		blockId: "instruction.smoke",
		bytes: renderManagedBlock(
			"instruction.smoke",
			"0.1.0",
			encoder.encode("managed\n"),
		),
	};

	test("accepts absent files and user-owned shared files", async () => {
		const root = await createTemporaryDirectory();

		expect(await inspectDesiredDestination(root, managedFile)).toMatchObject({
			status: "absent",
		});

		await write(root, "AGENTS.md", encoder.encode("# User instructions\n"));
		expect(await inspectDesiredDestination(root, managedBlock)).toMatchObject({
			status: "shared-file",
		});
	});

	test("rejects an unowned exact managed-file destination", async () => {
		const root = await createTemporaryDirectory();
		await write(root, managedFile.path, encoder.encode("existing\n"));

		expect(inspectDesiredDestination(root, managedFile)).rejects.toMatchObject({
			code: "OWNERSHIP_CONFLICT",
		});
	});

	test("rejects existing or malformed unowned managed blocks", async () => {
		const root = await createTemporaryDirectory();
		await write(root, "AGENTS.md", managedBlock.bytes);

		expect(inspectDesiredDestination(root, managedBlock)).rejects.toMatchObject(
			{ code: "OWNERSHIP_CONFLICT" },
		);

		await write(
			root,
			"AGENTS.md",
			encoder.encode("<!-- agents-pack:end id=instruction.smoke -->\n"),
		);
		expect(inspectDesiredDestination(root, managedBlock)).rejects.toMatchObject(
			{ code: "OWNERSHIP_CONFLICT" },
		);
	});
});

function lockWith(output: LockedOutput): LockFile {
	return {
		schemaVersion: 1,
		rendererVersion: 1,
		pack: {
			id: "agents-pack-smoke",
			version: "0.1.0",
			sha256: hashBytes(encoder.encode("pack")),
			source: { kind: "local" },
		},
		components: [
			{
				id: output.componentId,
				kind: "instruction",
				sha256: hashBytes(encoder.encode("component")),
			},
		],
		outputs: [output],
	};
}

async function statuses(root: string, lock: LockFile): Promise<string[]> {
	return (await inspectLockedOutputs(root, "repository", lock)).map(
		(output) => output.status,
	);
}

async function write(
	root: string,
	path: string,
	bytes: Uint8Array,
): Promise<void> {
	const absolute = join(root, ...path.split("/"));
	await mkdir(dirname(absolute), { recursive: true });
	await writeFile(absolute, bytes);
}

async function createTemporaryDirectory(): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), "agents-pack-inspect-"));
	temporaryDirectories.push(directory);
	return directory;
}
