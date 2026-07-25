import { describe, expect, test } from "bun:test";
import { hashBytes } from "../../src/core/hash.ts";
import {
	findManagedBlock,
	insertManagedBlock,
	removeManagedBlock,
	renderManagedBlock,
	replaceManagedBlock,
} from "../../src/filesystem/managed-block.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

describe("renderManagedBlock", () => {
	test("renders stable markers and adds a missing body newline", () => {
		const block = renderManagedBlock(
			"instruction.smoke",
			"0.1.0",
			bytes("body"),
		);

		expect(text(block)).toBe(
			[
				"<!-- agents-pack:start id=instruction.smoke version=0.1.0 -->",
				"body",
				"<!-- agents-pack:end id=instruction.smoke -->",
				"",
			].join("\n"),
		);
	});

	test("rejects marker-unsafe metadata", () => {
		expect(() =>
			renderManagedBlock("instruction smoke", "0.1.0", bytes("body")),
		).toThrow("not marker-safe");
	});

	test("rejects nested marker content in the body", () => {
		expect(() =>
			renderManagedBlock(
				"instruction.smoke",
				"0.1.0",
				bytes("<!-- agents-pack:end id=instruction.smoke -->"),
			),
		).toThrow("no matching opening marker");
	});
});

describe("managed block edits", () => {
	test("inserts into an empty file", () => {
		const block = versionOneBlock();

		expect(insertManagedBlock(new Uint8Array(), block)).toEqual(block);
	});

	test("inserts into a non-empty file with an owned separator", () => {
		const original = bytes("# 用户说明\nKeep this exact.\n");
		const block = versionOneBlock();
		const inserted = insertManagedBlock(original, block);

		expect(text(inserted)).toBe(`${text(original)}\n\n${text(block)}`);

		const match = findManagedBlock(inserted);
		expect(match?.blockId).toBe("instruction.smoke");
		expect(text(match?.ownedBytes ?? new Uint8Array())).toBe(
			`\n\n${text(block)}`,
		);
	});

	test("replaces only the marked block", () => {
		const before = bytes("Before 🌍");
		const after = bytes("After 用户\n");
		const inserted = insertManagedBlock(before, versionOneBlock());
		const withUserContentAfter = concatenate([inserted, after]);
		const replaced = replaceManagedBlock(
			withUserContentAfter,
			versionTwoBlock(),
		);

		expect(text(replaced)).toBe(
			`${text(before)}\n\n${text(versionTwoBlock())}${text(after)}`,
		);
	});

	test("removes the block and its owned separator exactly", () => {
		const original = bytes("# Existing\n\n用户内容\n");
		const inserted = insertManagedBlock(original, versionOneBlock());
		const removed = removeManagedBlock(inserted);

		expect(removed).toEqual(original);
	});

	test("preserves non-UTF-8 bytes outside the managed block", () => {
		const original = new Uint8Array([255, 254, 253]);
		const inserted = insertManagedBlock(original, versionOneBlock());

		expect(removeManagedBlock(inserted)).toEqual(original);
	});

	test("detects edits through the owned-region hash", () => {
		const inserted = insertManagedBlock(
			bytes("User content"),
			versionOneBlock(),
		);
		const original = findManagedBlock(inserted);
		const edited = bytes(text(inserted).replace("body-v1", "edited-body"));
		const changed = findManagedBlock(edited);

		expect(original).toBeDefined();
		expect(changed).toBeDefined();
		expect(hashBytes(changed?.ownedBytes ?? new Uint8Array())).not.toBe(
			hashBytes(original?.ownedBytes ?? new Uint8Array()),
		);
	});

	test("refuses replacement with a different block ID", () => {
		const inserted = insertManagedBlock(bytes("User"), versionOneBlock());
		const other = renderManagedBlock(
			"instruction.other",
			"0.2.0",
			bytes("body"),
		);

		expect(() => replaceManagedBlock(inserted, other)).toThrow(
			"Cannot replace managed block",
		);
	});
});

describe("malformed managed blocks", () => {
	test("rejects duplicate blocks", () => {
		const duplicate = concatenate([
			versionOneBlock(),
			bytes("\n\n"),
			versionOneBlock(),
		]);

		expect(() => findManagedBlock(duplicate)).toThrow("duplicated or nested");
	});

	test("rejects nested opening markers", () => {
		const nested = bytes(
			[
				"<!-- agents-pack:start id=instruction.smoke version=0.1.0 -->",
				"<!-- agents-pack:start id=instruction.other version=0.1.0 -->",
				"<!-- agents-pack:end id=instruction.other -->",
				"<!-- agents-pack:end id=instruction.smoke -->",
				"",
			].join("\n"),
		);

		expect(() => findManagedBlock(nested)).toThrow("duplicated or nested");
	});

	test("rejects mismatched marker IDs", () => {
		const mismatched = bytes(
			[
				"<!-- agents-pack:start id=instruction.smoke version=0.1.0 -->",
				"body",
				"<!-- agents-pack:end id=instruction.other -->",
				"",
			].join("\n"),
		);

		expect(() => findManagedBlock(mismatched)).toThrow("do not match");
	});

	test("rejects an edited marker", () => {
		const edited = bytes(
			text(versionOneBlock()).replace(
				"version=0.1.0 -->",
				"version=0.1.0 changed -->",
			),
		);

		expect(() => findManagedBlock(edited)).toThrow(
			"Malformed Agents Pack marker",
		);
	});

	test("rejects a block in a shared file without its owned separator", () => {
		const malformed = concatenate([bytes("User content\n"), versionOneBlock()]);

		expect(() => findManagedBlock(malformed)).toThrow(
			"missing its owned separator",
		);
	});
});

function versionOneBlock(): Uint8Array {
	return renderManagedBlock("instruction.smoke", "0.1.0", bytes("body-v1\n"));
}

function versionTwoBlock(): Uint8Array {
	return renderManagedBlock("instruction.smoke", "0.2.0", bytes("body-v2\n"));
}

function bytes(value: string): Uint8Array {
	return encoder.encode(value);
}

function text(value: Uint8Array): string {
	return decoder.decode(value);
}

function concatenate(parts: readonly Uint8Array[]): Uint8Array {
	const length = parts.reduce((total, part) => total + part.byteLength, 0);
	const result = new Uint8Array(length);
	let offset = 0;

	for (const part of parts) {
		result.set(part, offset);
		offset += part.byteLength;
	}

	return result;
}
