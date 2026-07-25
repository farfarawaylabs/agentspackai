import { readFile } from "node:fs/promises";
import { AgentsPackError } from "./errors.ts";
import { validatePortableRelativePath } from "./paths.ts";
import type {
	AgentTarget,
	LockFile,
	LockedOutput,
	Scope,
	ScopeConfig,
} from "./types.ts";

const AGENT_TARGETS = new Set<AgentTarget>(["claude", "codex", "cursor"]);
const SCOPES = new Set<Scope>(["global", "repository"]);
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const encoder = new TextEncoder();

type UnknownRecord = Record<string, unknown>;

export async function loadScopeConfig(
	configPath: string,
): Promise<ScopeConfig> {
	const source = await readStateFile(configPath, "scope configuration");

	let parsed: unknown;

	try {
		parsed = Bun.TOML.parse(source);
	} catch (cause) {
		throw malformedState(
			`Unable to parse scope configuration: ${configPath}`,
			cause,
		);
	}

	return parseScopeConfig(parsed, configPath);
}

export async function loadLockFile(lockPath: string): Promise<LockFile> {
	const source = await readStateFile(lockPath, "lockfile");

	let parsed: unknown;

	try {
		parsed = JSON.parse(source);
	} catch (cause) {
		throw malformedState(`Unable to parse lockfile: ${lockPath}`, cause);
	}

	return parseLockFile(parsed, lockPath);
}

export function serializeScopeConfig(config: ScopeConfig): Uint8Array {
	const targets = config.targets.map(quoteTomlString).join(", ");

	return encoder.encode(
		[
			`schema_version = ${config.schemaVersion}`,
			`scope = ${quoteTomlString(config.scope)}`,
			`pack_id = ${quoteTomlString(config.packId)}`,
			`pack_version = ${quoteTomlString(config.packVersion)}`,
			`targets = [${targets}]`,
			"",
		].join("\n"),
	);
}

export function serializeLockFile(lock: LockFile): Uint8Array {
	return encoder.encode(`${JSON.stringify(lock, null, 2)}\n`);
}

export function parseScopeConfig(
	value: unknown,
	source = "scope configuration",
): ScopeConfig {
	const record = requireRecord(value, source);

	if (record.schema_version !== 1) {
		throw malformedState(`${source}: schema_version must be 1`);
	}

	const scope = requireString(record.scope, "scope", source);

	if (!SCOPES.has(scope as Scope)) {
		throw malformedState(`${source}: scope must be global or repository`);
	}

	return {
		schemaVersion: 1,
		scope: scope as Scope,
		packId: requireString(record.pack_id, "pack_id", source),
		packVersion: requireString(record.pack_version, "pack_version", source),
		targets: requireTargets(record.targets, "targets", source),
	};
}

export function parseLockFile(value: unknown, source = "lockfile"): LockFile {
	const record = requireRecord(value, source);

	if (record.schemaVersion !== 1) {
		throw malformedState(`${source}: schemaVersion must be 1`);
	}

	const pack = requireRecord(record.pack, `${source}.pack`);
	const outputsValue = record.outputs;

	if (!Array.isArray(outputsValue) || outputsValue.length === 0) {
		throw malformedState(`${source}: outputs must be a non-empty array`);
	}

	const outputs = outputsValue.map((output, index) =>
		parseLockedOutput(output, index, source),
	);
	const identities = new Set<string>();
	const completeFilePaths = new Set(
		outputs
			.filter((output) => output.kind === "file")
			.map((output) => output.path),
	);

	for (const output of outputs) {
		const identity =
			output.kind === "managed-block"
				? `${output.path}#${output.blockId}`
				: output.path;

		if (identities.has(identity)) {
			throw malformedState(
				`${source}: output identity is duplicated: ${identity}`,
			);
		}

		if (output.kind === "managed-block" && completeFilePaths.has(output.path)) {
			throw malformedState(
				`${source}: a managed block cannot share a path with a complete managed file: ${output.path}`,
			);
		}

		identities.add(identity);
	}

	return {
		schemaVersion: 1,
		pack: {
			id: requireString(pack.id, "pack.id", source),
			version: requireString(pack.version, "pack.version", source),
			sha256: requireHash(pack.sha256, "pack.sha256", source),
		},
		outputs,
	};
}

function parseLockedOutput(
	value: unknown,
	index: number,
	source: string,
): LockedOutput {
	const field = `outputs[${index}]`;
	const output = requireRecord(value, `${source}.${field}`);
	const kind = requireString(output.kind, `${field}.kind`, source);
	const adapter = requireString(output.adapter, `${field}.adapter`, source);

	if (!AGENT_TARGETS.has(adapter as AgentTarget)) {
		throw malformedState(`${source}: ${field}.adapter is not supported`);
	}

	const path = requireString(output.path, `${field}.path`, source);

	try {
		validatePortableRelativePath(path, `${field}.path`);
	} catch (cause) {
		throw malformedState(`${source}: ${field}.path is not safe`, cause);
	}

	const base = {
		componentId: requireString(
			output.componentId,
			`${field}.componentId`,
			source,
		),
		adapter: adapter as AgentTarget,
		path,
		sha256: requireHash(output.sha256, `${field}.sha256`, source),
	};

	if (kind === "file") {
		if ("blockId" in output) {
			throw malformedState(
				`${source}: ${field}.blockId is valid only for managed blocks`,
			);
		}

		return {
			...base,
			kind: "file",
		};
	}

	if (kind === "managed-block") {
		if (adapter !== "codex") {
			throw malformedState(
				`${source}: ${field}.managed-block adapter must be codex`,
			);
		}

		return {
			...base,
			kind: "managed-block",
			adapter: "codex",
			blockId: requireString(output.blockId, `${field}.blockId`, source),
		};
	}

	throw malformedState(
		`${source}: ${field}.kind must be file or managed-block`,
	);
}

function requireTargets(
	value: unknown,
	field: string,
	source: string,
): AgentTarget[] {
	if (!Array.isArray(value) || value.length === 0) {
		throw malformedState(`${source}: ${field} must be a non-empty array`);
	}

	const targets = value.map((target, index) => {
		if (
			typeof target !== "string" ||
			!AGENT_TARGETS.has(target as AgentTarget)
		) {
			throw malformedState(
				`${source}: ${field}[${index}] is not a supported agent`,
			);
		}

		return target as AgentTarget;
	});

	if (new Set(targets).size !== targets.length) {
		throw malformedState(`${source}: ${field} must not contain duplicates`);
	}

	return targets;
}

function requireRecord(value: unknown, field: string): UnknownRecord {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw malformedState(`${field} must be an object`);
	}

	return value as UnknownRecord;
}

function requireString(value: unknown, field: string, source: string): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw malformedState(`${source}: ${field} must be a non-empty string`);
	}

	return value;
}

function requireHash(value: unknown, field: string, source: string): string {
	const hash = requireString(value, field, source);

	if (!SHA256.test(hash)) {
		throw malformedState(`${source}: ${field} must be a SHA-256 hash`);
	}

	return hash;
}

async function readStateFile(path: string, label: string): Promise<string> {
	try {
		return await readFile(path, "utf8");
	} catch (cause) {
		throw malformedState(`Unable to read ${label}: ${path}`, cause);
	}
}

function malformedState(message: string, cause?: unknown): AgentsPackError {
	return new AgentsPackError("MALFORMED_STATE", message, { cause });
}

function quoteTomlString(value: string): string {
	return JSON.stringify(value);
}
