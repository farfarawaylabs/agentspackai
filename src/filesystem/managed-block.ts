import { AgentsPackError } from "../core/errors.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MARKER_TOKEN = /^[A-Za-z0-9._+-]+$/;
const OPENING_MARKER =
	/^<!-- agents-pack:start id=([A-Za-z0-9._+-]+) version=([A-Za-z0-9._+-]+) -->$/;
const CLOSING_MARKER = /^<!-- agents-pack:end id=([A-Za-z0-9._+-]+) -->$/;
const OWNED_SEPARATOR = encoder.encode("\n\n");

export interface ManagedBlock {
	blockId: string;
	version: string;
	markerStartOffset: number;
	ownedStartOffset: number;
	endOffset: number;
	blockBytes: Uint8Array;
	ownedBytes: Uint8Array;
}

interface Line {
	startOffset: number;
	endOffset: number;
	text: string;
}

export function renderManagedBlock(
	blockId: string,
	version: string,
	body: Uint8Array,
): Uint8Array {
	requireMarkerToken(blockId, "Managed block ID");
	requireMarkerToken(version, "Managed block version");

	const opening = encoder.encode(
		`<!-- agents-pack:start id=${blockId} version=${version} -->\n`,
	);
	const closing = encoder.encode(`<!-- agents-pack:end id=${blockId} -->\n`);
	const bodySuffix = endsWithNewline(body)
		? new Uint8Array()
		: encoder.encode("\n");

	const rendered = concatenate([opening, body, bodySuffix, closing]);
	validateRenderedBlock(rendered);
	return rendered;
}

export function findManagedBlock(
	fileBytes: Uint8Array,
): ManagedBlock | undefined {
	const lines = splitLines(fileBytes);
	let opening:
		| {
				blockId: string;
				version: string;
				line: Line;
		  }
		| undefined;
	let result: ManagedBlock | undefined;

	for (const line of lines) {
		if (!line.text.includes("<!-- agents-pack:")) {
			continue;
		}

		const openingMatch = OPENING_MARKER.exec(line.text);
		const closingMatch = CLOSING_MARKER.exec(line.text);

		if (openingMatch !== null) {
			if (opening !== undefined || result !== undefined) {
				throw malformedBlock("Managed block markers are duplicated or nested.");
			}

			opening = {
				blockId: requireCapture(openingMatch[1]),
				version: requireCapture(openingMatch[2]),
				line,
			};
			continue;
		}

		if (closingMatch !== null) {
			if (opening === undefined) {
				throw malformedBlock(
					"Managed block closing marker has no matching opening marker.",
				);
			}

			const closingBlockId = requireCapture(closingMatch[1]);

			if (closingBlockId !== opening.blockId) {
				throw malformedBlock(
					`Managed block marker IDs do not match: ${opening.blockId} and ${closingBlockId}.`,
				);
			}

			const markerStartOffset = opening.line.startOffset;
			const ownedStartOffset = ownedStart(fileBytes, markerStartOffset);

			result = {
				blockId: opening.blockId,
				version: opening.version,
				markerStartOffset,
				ownedStartOffset,
				endOffset: line.endOffset,
				blockBytes: fileBytes.slice(markerStartOffset, line.endOffset),
				ownedBytes: fileBytes.slice(ownedStartOffset, line.endOffset),
			};
			opening = undefined;
			continue;
		}

		throw malformedBlock(`Malformed Agents Pack marker: ${line.text}`);
	}

	if (opening !== undefined) {
		throw malformedBlock(
			`Managed block ${opening.blockId} has no closing marker.`,
		);
	}

	return result;
}

export function insertManagedBlock(
	fileBytes: Uint8Array,
	blockBytes: Uint8Array,
): Uint8Array {
	if (findManagedBlock(fileBytes) !== undefined) {
		throw malformedBlock("A managed block already exists.");
	}

	validateRenderedBlock(blockBytes);

	if (fileBytes.byteLength === 0) {
		return blockBytes.slice();
	}

	return concatenate([fileBytes, OWNED_SEPARATOR, blockBytes]);
}

export function replaceManagedBlock(
	fileBytes: Uint8Array,
	blockBytes: Uint8Array,
): Uint8Array {
	const current = requireManagedBlock(fileBytes);
	const replacement = validateRenderedBlock(blockBytes);

	if (replacement.blockId !== current.blockId) {
		throw malformedBlock(
			`Cannot replace managed block ${current.blockId} with ${replacement.blockId}.`,
		);
	}

	return concatenate([
		fileBytes.slice(0, current.markerStartOffset),
		blockBytes,
		fileBytes.slice(current.endOffset),
	]);
}

export function removeManagedBlock(fileBytes: Uint8Array): Uint8Array {
	const current = requireManagedBlock(fileBytes);

	return concatenate([
		fileBytes.slice(0, current.ownedStartOffset),
		fileBytes.slice(current.endOffset),
	]);
}

function validateRenderedBlock(blockBytes: Uint8Array): ManagedBlock {
	const block = findManagedBlock(blockBytes);

	if (block === undefined) {
		throw malformedBlock("Rendered managed block has no markers.");
	}

	if (
		block.ownedStartOffset !== 0 ||
		block.markerStartOffset !== 0 ||
		block.endOffset !== blockBytes.byteLength
	) {
		throw malformedBlock(
			"Rendered managed block must contain only one complete block.",
		);
	}

	return block;
}

function requireManagedBlock(fileBytes: Uint8Array): ManagedBlock {
	const block = findManagedBlock(fileBytes);

	if (block === undefined) {
		throw malformedBlock("Managed block is missing.");
	}

	return block;
}

function ownedStart(fileBytes: Uint8Array, markerStartOffset: number): number {
	if (markerStartOffset === 0) {
		return 0;
	}

	if (
		markerStartOffset < OWNED_SEPARATOR.byteLength ||
		fileBytes[markerStartOffset - 2] !== OWNED_SEPARATOR[0] ||
		fileBytes[markerStartOffset - 1] !== OWNED_SEPARATOR[1]
	) {
		throw malformedBlock(
			"Managed block in a shared file is missing its owned separator.",
		);
	}

	return markerStartOffset - OWNED_SEPARATOR.byteLength;
}

function splitLines(bytes: Uint8Array): Line[] {
	const lines: Line[] = [];
	let startOffset = 0;

	while (startOffset < bytes.byteLength) {
		const newlineOffset = bytes.indexOf(10, startOffset);
		const hasNewline = newlineOffset !== -1;
		const contentEnd = hasNewline ? newlineOffset : bytes.byteLength;
		const endOffset = hasNewline ? newlineOffset + 1 : bytes.byteLength;
		let markerEnd = contentEnd;

		if (markerEnd > startOffset && bytes[markerEnd - 1] === 13) {
			markerEnd -= 1;
		}

		lines.push({
			startOffset,
			endOffset,
			text: decoder.decode(bytes.slice(startOffset, markerEnd)),
		});
		startOffset = endOffset;
	}

	return lines;
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

function endsWithNewline(bytes: Uint8Array): boolean {
	return bytes.byteLength > 0 && bytes[bytes.byteLength - 1] === 10;
}

function requireMarkerToken(value: string, label: string): void {
	if (!MARKER_TOKEN.test(value)) {
		throw malformedBlock(`${label} is not marker-safe: ${value}`);
	}
}

function requireCapture(value: string | undefined): string {
	if (value === undefined) {
		throw malformedBlock("Managed block marker is missing required metadata.");
	}

	return value;
}

function malformedBlock(message: string): AgentsPackError {
	return new AgentsPackError("MALFORMED_STATE", message);
}
