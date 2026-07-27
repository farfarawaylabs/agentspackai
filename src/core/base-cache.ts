import { lstat, mkdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { atomicWriteFile } from "../filesystem/atomic-write.ts";
import { AgentsPackError } from "./errors.ts";
import { hashBytes } from "./hash.ts";
import { loadPackFromFiles } from "./pack.ts";
import type { BaseCache, LoadedPack, PackFile } from "./types.ts";

const SHA256 = /^sha256:([a-f0-9]{64})$/;
const encoder = new TextEncoder();

export function getBaseCachePath(userHome: string, packHash: string): string {
	const match = packHash.match(SHA256);

	if (match === null) {
		throw new AgentsPackError(
			"INVALID_PACK",
			"Pack cache key must be a SHA-256 hash.",
		);
	}

	return join(
		resolve(userHome),
		".agents-pack",
		"cache",
		"packs",
		`${match[1]}.pack`,
	);
}

export async function cachePack(
	userHome: string,
	pack: LoadedPack,
): Promise<string> {
	const cachePath = getBaseCachePath(userHome, pack.sha256);
	const existing = await lstatOrUndefined(cachePath);

	if (existing !== undefined) {
		if (!existing.isFile()) {
			throw invalidBase(`Base cache path is not a file: ${cachePath}`);
		}

		const cached = await loadCachedPack(userHome, pack.sha256);

		if (
			cached.manifest.id !== pack.manifest.id ||
			cached.manifest.version !== pack.manifest.version
		) {
			throw invalidBase(
				`Base cache entry does not match ${pack.manifest.id}@${pack.manifest.version}.`,
			);
		}

		return cachePath;
	}

	await mkdir(resolve(cachePath, ".."), { recursive: true, mode: 0o700 });
	await atomicWriteFile(cachePath, serializeBase(pack), { mode: 0o600 });
	await loadCachedPack(userHome, pack.sha256);
	return cachePath;
}

export async function loadCachedPack(
	userHome: string,
	packHash: string,
): Promise<LoadedPack> {
	const cachePath = getBaseCachePath(userHome, packHash);
	let source: string;

	try {
		source = await readFile(cachePath, "utf8");
	} catch (cause) {
		throw new AgentsPackError(
			"MALFORMED_STATE",
			`The installed Base is unavailable: ${cachePath}. Provide the exact pack again with update.`,
			{ cause },
		);
	}

	let value: unknown;

	try {
		value = JSON.parse(source);
	} catch (cause) {
		throw invalidBase(`Unable to parse Base cache entry: ${cachePath}`, cause);
	}

	const base = parseBase(value, cachePath);
	const files: PackFile[] = base.files.map((file) => ({
		path: file.path,
		sha256: file.sha256,
		bytes: new Uint8Array(Buffer.from(file.contentBase64, "base64")),
	}));
	const pack = loadPackFromFiles(files, cachePath);

	if (
		pack.sha256 !== packHash ||
		base.pack.sha256 !== packHash ||
		base.pack.id !== pack.manifest.id ||
		base.pack.version !== pack.manifest.version
	) {
		throw invalidBase(
			`Base cache digest or identity does not match: ${cachePath}`,
		);
	}

	return pack;
}

function serializeBase(pack: LoadedPack): Uint8Array {
	const base: BaseCache = {
		schemaVersion: 1,
		pack: {
			id: pack.manifest.id,
			version: pack.manifest.version,
			sha256: pack.sha256,
			source: { kind: "local" },
		},
		files: pack.files.map((file) => ({
			path: file.path,
			sha256: file.sha256,
			contentBase64: Buffer.from(file.bytes).toString("base64"),
		})),
	};

	return encoder.encode(`${JSON.stringify(base, null, 2)}\n`);
}

function parseBase(value: unknown, source: string): BaseCache {
	if (!isRecord(value) || value.schemaVersion !== 1) {
		throw invalidBase(`${source}: schemaVersion must be 1`);
	}

	if (!isRecord(value.pack) || !isRecord(value.pack.source)) {
		throw invalidBase(`${source}: pack metadata is malformed`);
	}

	if (value.pack.source.kind !== "local") {
		throw invalidBase(`${source}: pack.source.kind must be local`);
	}

	if (!Array.isArray(value.files) || value.files.length === 0) {
		throw invalidBase(`${source}: files must be a non-empty array`);
	}

	const files = value.files.map((entry, index) => {
		if (
			!isRecord(entry) ||
			typeof entry.path !== "string" ||
			typeof entry.sha256 !== "string" ||
			typeof entry.contentBase64 !== "string"
		) {
			throw invalidBase(`${source}: files[${index}] is malformed`);
		}

		const bytes = new Uint8Array(Buffer.from(entry.contentBase64, "base64"));

		if (hashBytes(bytes) !== entry.sha256) {
			throw invalidBase(`${source}: files[${index}] hash does not match`);
		}

		return {
			path: entry.path,
			sha256: entry.sha256,
			contentBase64: entry.contentBase64,
		};
	});

	return {
		schemaVersion: 1,
		pack: {
			id: requireString(value.pack.id, `${source}.pack.id`),
			version: requireString(value.pack.version, `${source}.pack.version`),
			sha256: requireHash(value.pack.sha256, `${source}.pack.sha256`),
			source: { kind: "local" },
		},
		files,
	};
}

function requireString(value: unknown, field: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw invalidBase(`${field} must be a non-empty string`);
	}

	return value;
}

function requireHash(value: unknown, field: string): string {
	const hash = requireString(value, field);

	if (!SHA256.test(hash)) {
		throw invalidBase(`${field} must be a SHA-256 hash`);
	}

	return hash;
}

async function lstatOrUndefined(
	path: string,
): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
	try {
		return await lstat(path);
	} catch (error) {
		if (
			error instanceof Error &&
			"code" in error &&
			(error as NodeJS.ErrnoException).code === "ENOENT"
		) {
			return undefined;
		}

		throw error;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidBase(message: string, cause?: unknown): AgentsPackError {
	return new AgentsPackError("INVALID_PACK", message, { cause });
}
