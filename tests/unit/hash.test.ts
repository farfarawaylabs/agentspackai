import { describe, expect, test } from "bun:test";
import { hashBytes, hashPackFiles } from "../../src/core/hash.ts";
import type { PackFile } from "../../src/core/types.ts";

const encoder = new TextEncoder();

describe("hashBytes", () => {
	test("returns a prefixed SHA-256 hash", () => {
		expect(hashBytes(encoder.encode("abc"))).toBe(
			"sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);
	});
});

describe("hashPackFiles", () => {
	test("is independent of input ordering", () => {
		const first = packFile("a.md", "first");
		const second = packFile("b.md", "second");

		expect(hashPackFiles([second, first])).toBe(hashPackFiles([first, second]));
	});

	test("frames paths and content unambiguously", () => {
		expect(hashPackFiles([packFile("a", "bc")])).not.toBe(
			hashPackFiles([packFile("ab", "c")]),
		);
	});
});

function packFile(path: string, content: string): PackFile {
	const bytes = encoder.encode(content);

	return {
		path,
		bytes,
		sha256: hashBytes(bytes),
	};
}
