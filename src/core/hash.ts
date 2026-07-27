import { createHash } from "node:crypto";
import type { LoadedPack, PackComponent, PackFile } from "./types.ts";

const encoder = new TextEncoder();

export function hashBytes(bytes: Uint8Array): string {
	return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function hashPackFiles(files: readonly PackFile[]): string {
	const hash = createHash("sha256");
	const sortedFiles = [...files].sort((left, right) =>
		comparePaths(left.path, right.path),
	);

	for (const file of sortedFiles) {
		updateFramed(hash, encoder.encode(file.path));
		updateFramed(hash, file.bytes);
	}

	return `sha256:${hash.digest("hex")}`;
}

export function hashPackComponent(
	pack: LoadedPack,
	component: PackComponent,
): string {
	const hash = createHash("sha256");
	const metadata = encoder.encode(
		JSON.stringify({
			id: component.id,
			kind: component.kind,
			title: component.title,
			summary: component.summary,
			category: component.category,
			selection: component.selection,
			source: component.source,
			targets: component.targets,
		}),
	);
	updateFramed(hash, metadata);

	const sourcePrefix = `${component.source}/`;
	const files = pack.files
		.filter(
			(file) =>
				file.path === component.source || file.path.startsWith(sourcePrefix),
		)
		.sort((left, right) => comparePaths(left.path, right.path));

	for (const file of files) {
		updateFramed(hash, encoder.encode(file.path));
		updateFramed(hash, file.bytes);
	}

	return `sha256:${hash.digest("hex")}`;
}

function comparePaths(left: string, right: string): number {
	if (left < right) {
		return -1;
	}

	if (left > right) {
		return 1;
	}

	return 0;
}

function updateFramed(
	hash: ReturnType<typeof createHash>,
	bytes: Uint8Array,
): void {
	const length = Buffer.allocUnsafe(8);
	length.writeBigUInt64BE(BigInt(bytes.byteLength));
	hash.update(length);
	hash.update(bytes);
}
