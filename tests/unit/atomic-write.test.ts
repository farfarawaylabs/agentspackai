import { afterEach, describe, expect, test } from "bun:test";
import {
	chmod,
	mkdtemp,
	readFile,
	readdir,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { atomicWriteFile } from "../../src/filesystem/atomic-write.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("atomicWriteFile", () => {
	test("replaces bytes and preserves the requested mode", async () => {
		const directory = await createTemporaryDirectory();
		const path = join(directory, "managed.md");
		await writeFile(path, "old");
		await chmod(path, 0o640);

		await atomicWriteFile(path, new TextEncoder().encode("new"), {
			mode: (await stat(path)).mode,
		});

		expect(await readFile(path, "utf8")).toBe("new");
		expect((await stat(path)).mode & 0o777).toBe(0o640);
	});

	test("keeps the original file and removes its temp file before rename failure", async () => {
		const directory = await createTemporaryDirectory();
		const path = join(directory, "managed.md");
		await writeFile(path, "old");

		expect(
			atomicWriteFile(path, new TextEncoder().encode("new"), {
				beforeRename: () => {
					throw new Error("Injected rename failure");
				},
			}),
		).rejects.toThrow("Injected rename failure");

		expect(await readFile(path, "utf8")).toBe("old");
		expect(await readdir(directory)).toEqual(["managed.md"]);
	});
});

async function createTemporaryDirectory(): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), "agents-pack-atomic-"));
	temporaryDirectories.push(directory);
	return directory;
}
