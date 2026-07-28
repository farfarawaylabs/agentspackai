import { AgentsPackError } from "./errors.ts";
import { loadPackArtifact } from "./base-cache.ts";
import type { LoadedPack } from "./types.ts";
import { isSemanticVersion } from "./versions.ts";

export const OFFICIAL_CORE_PACK_ID = "agents-pack-core";
export const DEFAULT_REGISTRY_URL =
	"https://farfarawaylabs.github.io/agentspackai/registry/v1/index.json";
export const REGISTRY_URL_ENV = "AGENTS_PACK_REGISTRY_URL";

const MAX_REGISTRY_BYTES = 1024 * 1024;
const MAX_PACK_BYTES = 25 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;
const SAFE_PACK_ID = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const SAFE_TAG_PREFIX = /^[a-z0-9][a-z0-9._-]*-v$/;

type UnknownRecord = Record<string, unknown>;
type Fetcher = typeof fetch;

export interface PackRegistryRelease {
	url: string;
}

export interface PackRegistryEntry {
	latest: string;
	tagPrefix: string;
	versions: Record<string, PackRegistryRelease>;
}

export interface PackRegistry {
	schemaVersion: 1;
	packs: Record<string, PackRegistryEntry>;
}

export interface OfficialPackOptions {
	registryUrl?: string;
	fetcher?: Fetcher;
}

export async function loadOfficialPack(
	packId: string,
	options: OfficialPackOptions = {},
): Promise<LoadedPack> {
	const registryUrl =
		options.registryUrl ??
		process.env[REGISTRY_URL_ENV] ??
		DEFAULT_REGISTRY_URL;
	const fetcher = options.fetcher ?? fetch;
	const registryBytes = await fetchBytes(
		registryUrl,
		MAX_REGISTRY_BYTES,
		"registry",
		fetcher,
	);
	let value: unknown;

	try {
		value = JSON.parse(new TextDecoder().decode(registryBytes));
	} catch (cause) {
		throw remoteError(`Unable to parse pack registry: ${registryUrl}`, cause);
	}

	const registry = parsePackRegistry(value, registryUrl);
	const entry = registry.packs[packId];

	if (entry === undefined) {
		throw remoteError(`The official registry does not contain pack ${packId}.`);
	}

	const release = entry.versions[entry.latest];

	if (release === undefined) {
		throw remoteError(
			`The official registry latest version ${entry.latest} is missing its release entry.`,
		);
	}

	const artifactBytes = await fetchBytes(
		release.url,
		MAX_PACK_BYTES,
		"pack artifact",
		fetcher,
	);
	const { pack } = loadPackArtifact(artifactBytes, release.url);

	if (
		pack.source.kind !== "official" ||
		pack.manifest.id !== packId ||
		pack.manifest.version !== entry.latest
	) {
		throw remoteError(
			`Official artifact identity does not match ${packId}@${entry.latest}.`,
		);
	}

	return pack;
}

export function parsePackRegistry(
	value: unknown,
	source = "pack registry",
): PackRegistry {
	const record = requireRecord(value, source);

	if (record.schema_version !== 1) {
		throw remoteError(`${source}: schema_version must be 1.`);
	}

	const packsRecord = requireRecord(record.packs, `${source}.packs`);
	const packEntries = Object.entries(packsRecord);

	if (packEntries.length === 0) {
		throw remoteError(`${source}: packs must not be empty.`);
	}

	const packs = Object.create(null) as Record<string, PackRegistryEntry>;

	for (const [packId, rawEntry] of packEntries) {
		if (!SAFE_PACK_ID.test(packId)) {
			throw remoteError(`${source}: invalid pack ID ${packId}.`);
		}

		const entry = requireRecord(rawEntry, `${source}.packs.${packId}`);
		const latest = requireVersion(
			entry.latest,
			`${source}.packs.${packId}.latest`,
		);
		const tagPrefix = requireString(
			entry.tag_prefix,
			`${source}.packs.${packId}.tag_prefix`,
		);

		if (!SAFE_TAG_PREFIX.test(tagPrefix)) {
			throw remoteError(
				`${source}.packs.${packId}.tag_prefix is not a safe release-tag prefix.`,
			);
		}

		const versionsRecord = requireRecord(
			entry.versions,
			`${source}.packs.${packId}.versions`,
		);
		const versions = Object.create(null) as Record<string, PackRegistryRelease>;

		for (const [version, rawRelease] of Object.entries(versionsRecord)) {
			if (!isSemanticVersion(version)) {
				throw remoteError(
					`${source}: registry version must use semantic versioning: ${version}.`,
				);
			}

			const release = requireRecord(
				rawRelease,
				`${source}.packs.${packId}.versions.${version}`,
			);
			const url = requireString(
				release.url,
				`${source}.packs.${packId}.versions.${version}.url`,
			);
			validateRemoteUrl(url, `${source} release URL`);
			versions[version] = { url };
		}

		if (versions[latest] === undefined) {
			throw remoteError(
				`${source}: latest version ${latest} is missing from versions.`,
			);
		}

		packs[packId] = { latest, tagPrefix, versions };
	}

	return { schemaVersion: 1, packs };
}

async function fetchBytes(
	url: string,
	maxBytes: number,
	label: string,
	fetcher: Fetcher,
): Promise<Uint8Array> {
	validateRemoteUrl(url, label);
	let response: Response;

	try {
		response = await fetcher(url, {
			headers: { Accept: "application/json, application/octet-stream" },
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
	} catch (cause) {
		throw remoteError(`Unable to download ${label}: ${url}`, cause);
	}

	if (!response.ok) {
		throw remoteError(
			`Unable to download ${label}: ${url} returned HTTP ${response.status}.`,
		);
	}

	const contentLength = response.headers.get("content-length");

	if (
		contentLength !== null &&
		Number.isFinite(Number(contentLength)) &&
		Number(contentLength) > maxBytes
	) {
		throw remoteError(`${label} exceeds the ${maxBytes}-byte size limit.`);
	}

	let bytes: Uint8Array;

	try {
		bytes = new Uint8Array(await response.arrayBuffer());
	} catch (cause) {
		throw remoteError(`Unable to read downloaded ${label}: ${url}`, cause);
	}

	if (bytes.byteLength > maxBytes) {
		throw remoteError(`${label} exceeds the ${maxBytes}-byte size limit.`);
	}

	return bytes;
}

function validateRemoteUrl(value: string, label: string): void {
	let url: URL;

	try {
		url = new URL(value);
	} catch (cause) {
		throw remoteError(`${label} is not a valid URL: ${value}`, cause);
	}

	const localHttp =
		url.protocol === "http:" &&
		(url.hostname === "localhost" ||
			url.hostname === "127.0.0.1" ||
			url.hostname === "::1");

	if (url.protocol !== "https:" && !localHttp) {
		throw remoteError(`${label} must use HTTPS.`);
	}
}

function requireRecord(value: unknown, field: string): UnknownRecord {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw remoteError(`${field} must be an object.`);
	}

	return value as UnknownRecord;
}

function requireString(value: unknown, field: string): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw remoteError(`${field} must be a non-empty string.`);
	}

	return value;
}

function requireVersion(value: unknown, field: string): string {
	const version = requireString(value, field);

	if (!isSemanticVersion(version)) {
		throw remoteError(`${field} must use semantic versioning.`);
	}

	return version;
}

function remoteError(message: string, cause?: unknown): AgentsPackError {
	return new AgentsPackError("REMOTE_ERROR", message, { cause });
}
