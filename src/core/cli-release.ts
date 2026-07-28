import { AgentsPackError } from "./errors.ts";

export const CLI_RELEASE_TARGETS = [
	"darwin-arm64",
	"darwin-x64",
	"linux-arm64",
	"linux-x64",
] as const;

export type CliReleaseTarget = (typeof CLI_RELEASE_TARGETS)[number];

export interface CliReleaseVersion {
	baseUrl: string;
	checksums: string;
	assets: Record<CliReleaseTarget, string>;
}

export interface CliReleaseRegistry {
	schemaVersion: 1;
	latest: string;
	tagPrefix: string;
	versions: Record<string, CliReleaseVersion>;
}

const SEMANTIC_VERSION =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const HTTPS_URL = /^https:\/\//;

export function parseCliReleaseRegistry(
	value: unknown,
	source = "CLI release registry",
): CliReleaseRegistry {
	if (!isRecord(value)) {
		throw invalid(source, "must be an object.");
	}

	if (value.schema_version !== 1) {
		throw invalid(source, "must use schema_version 1.");
	}

	const latest = requireVersion(value.latest, `${source} latest`);
	const tagPrefix = requireString(value.tag_prefix, `${source} tag_prefix`);

	if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(tagPrefix)) {
		throw invalid(
			source,
			"tag_prefix must contain only lowercase letters, numbers, and hyphens.",
		);
	}

	if (!isRecord(value.versions)) {
		throw invalid(source, "versions must be an object.");
	}

	const versions: Record<string, CliReleaseVersion> = {};

	for (const [version, entry] of Object.entries(value.versions)) {
		requireVersion(version, `${source} version key`);

		if (!isRecord(entry)) {
			throw invalid(source, `version ${version} must be an object.`);
		}

		const baseUrl = requireHttpsUrl(
			entry.base_url,
			`${source} version ${version} base_url`,
		);
		const expectedBaseSuffix = `/${tagPrefix}${version}`;

		if (!new URL(baseUrl).pathname.endsWith(expectedBaseSuffix)) {
			throw invalid(
				source,
				`version ${version} base_url must end with ${expectedBaseSuffix}.`,
			);
		}

		const checksums = requireFileName(
			entry.checksums,
			`${source} version ${version} checksums`,
		);
		const expectedChecksums = `agents-pack-${version}-checksums.txt`;

		if (checksums !== expectedChecksums) {
			throw invalid(
				source,
				`version ${version} checksums must be ${expectedChecksums}.`,
			);
		}

		if (!isRecord(entry.assets)) {
			throw invalid(source, `version ${version} assets must be an object.`);
		}

		const assets = {} as Record<CliReleaseTarget, string>;
		const assetKeys = Object.keys(entry.assets).sort();
		const expectedKeys = [...CLI_RELEASE_TARGETS].sort();

		if (JSON.stringify(assetKeys) !== JSON.stringify(expectedKeys)) {
			throw invalid(
				source,
				`version ${version} assets must contain exactly ${expectedKeys.join(", ")}.`,
			);
		}

		for (const target of CLI_RELEASE_TARGETS) {
			const asset = requireFileName(
				entry.assets[target],
				`${source} version ${version} asset ${target}`,
			);
			const expectedAsset = cliArchiveName(version, target);

			if (asset !== expectedAsset) {
				throw invalid(
					source,
					`version ${version} asset ${target} must be ${expectedAsset}.`,
				);
			}

			assets[target] = asset;
		}

		versions[version] = { baseUrl, checksums, assets };
	}

	if (versions[latest] === undefined) {
		throw invalid(source, `latest version ${latest} is not declared.`);
	}

	return {
		schemaVersion: 1,
		latest,
		tagPrefix,
		versions,
	};
}

export function validateCliRelease(
	registry: CliReleaseRegistry,
	version: string,
	tag?: string,
): CliReleaseVersion {
	requireVersion(version, "CLI version");
	const release = registry.versions[version];

	if (release === undefined) {
		throw invalid(
			"CLI release registry",
			`does not contain version ${version}.`,
		);
	}

	if (registry.latest !== version) {
		throw invalid(
			"CLI release registry",
			`latest ${registry.latest} does not match CLI version ${version}.`,
		);
	}

	if (tag !== undefined) {
		const expectedTag = `${registry.tagPrefix}${version}`;

		if (tag !== expectedTag) {
			throw invalid(
				"CLI release",
				`tag ${tag} does not match expected tag ${expectedTag}.`,
			);
		}
	}

	return release;
}

export function cliArchiveName(
	version: string,
	target: CliReleaseTarget,
): string {
	return `agents-pack-${version}-${target}.tar.gz`;
}

export function isCliReleaseTarget(value: string): value is CliReleaseTarget {
	return CLI_RELEASE_TARGETS.some((target) => target === value);
}

function requireVersion(value: unknown, label: string): string {
	const version = requireString(value, label);

	if (!SEMANTIC_VERSION.test(version)) {
		throw invalid(label, "must be a semantic version.");
	}

	return version;
}

function requireHttpsUrl(value: unknown, label: string): string {
	const url = requireString(value, label);

	if (!HTTPS_URL.test(url)) {
		throw invalid(label, "must be an HTTPS URL.");
	}

	try {
		new URL(url);
	} catch {
		throw invalid(label, "must be a valid URL.");
	}

	return url.replace(/\/+$/, "");
}

function requireFileName(value: unknown, label: string): string {
	const name = requireString(value, label);

	if (
		name === "." ||
		name === ".." ||
		name.includes("/") ||
		name.includes("\\") ||
		!name.trim()
	) {
		throw invalid(label, "must be a plain file name.");
	}

	return name;
}

function requireString(value: unknown, label: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw invalid(label, "must be a non-empty string.");
	}

	return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(source: string, detail: string): AgentsPackError {
	return new AgentsPackError("INVALID_PACK", `${source} ${detail}`, {
		exitCode: 1,
	});
}
