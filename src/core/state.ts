import { lstat, readFile } from "node:fs/promises";
import { AgentsPackError } from "./errors.ts";
import { validatePortableRelativePath } from "./paths.ts";
import type {
	AgentTarget,
	ComponentKind,
	LockFile,
	LockedComponent,
	LockedOutput,
	PackSourceKind,
	Scope,
	ScopeConfig,
} from "./types.ts";

const AGENT_TARGETS = new Set<AgentTarget>(["claude", "codex", "cursor"]);
const COMPONENT_KINDS = new Set<ComponentKind>([
	"instruction",
	"skill",
	"subagent",
]);
const SCOPES = new Set<Scope>(["global", "repository"]);
const PACK_SOURCE_KINDS = new Set<PackSourceKind>(["local", "official"]);
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

export async function loadLockFileIfExists(
	lockPath: string,
): Promise<LockFile | undefined> {
	try {
		const info = await lstat(lockPath);

		if (!info.isFile()) {
			throw malformedState(`Lockfile path is not a regular file: ${lockPath}`);
		}
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

	return loadLockFile(lockPath);
}

export function serializeScopeConfig(config: ScopeConfig): Uint8Array {
	const targets = config.targets.map(quoteTomlString).join(", ");
	const components = config.components
		.map((component) => `  ${quoteTomlString(component)},`)
		.join("\n");

	return encoder.encode(
		[
			`schema_version = ${config.schemaVersion}`,
			`scope = ${quoteTomlString(config.scope)}`,
			`targets = [${targets}]`,
			"components = [",
			components,
			"]",
			"",
			"[pack]",
			`id = ${quoteTomlString(config.pack.id)}`,
			`source = ${quoteTomlString(config.pack.source)}`,
			...(config.pack.pinnedVersion === undefined
				? []
				: [`pinned_version = ${quoteTomlString(config.pack.pinnedVersion)}`]),
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

	const pack = requireRecord(record.pack, `${source}.pack`);
	const packSource = requireString(pack.source, "pack.source", source);

	if (!PACK_SOURCE_KINDS.has(packSource as PackSourceKind)) {
		throw malformedState(`${source}: pack.source must be local or official`);
	}

	return {
		schemaVersion: 1,
		scope: scope as Scope,
		targets: requireTargets(record.targets, "targets", source),
		components: requireUniqueStrings(record.components, "components", source),
		pack: {
			id: requireString(pack.id, "pack.id", source),
			source: packSource as PackSourceKind,
			...("pinned_version" in pack
				? {
						pinnedVersion: requireString(
							pack.pinned_version,
							"pack.pinned_version",
							source,
						),
					}
				: {}),
		},
	};
}

export function parseLockFile(value: unknown, source = "lockfile"): LockFile {
	const record = requireRecord(value, source);

	if (record.schemaVersion !== 1) {
		throw malformedState(`${source}: schemaVersion must be 1`);
	}

	if (record.rendererVersion !== 1) {
		throw malformedState(`${source}: rendererVersion must be 1`);
	}

	const pack = requireRecord(record.pack, `${source}.pack`);
	const packSource = requireRecord(pack.source, `${source}.pack.source`);

	if (
		typeof packSource.kind !== "string" ||
		!PACK_SOURCE_KINDS.has(packSource.kind as PackSourceKind)
	) {
		throw malformedState(
			`${source}: pack.source.kind must be local or official`,
		);
	}

	if (!Array.isArray(record.components) || record.components.length === 0) {
		throw malformedState(`${source}: components must be a non-empty array`);
	}

	const components = record.components.map((component, index) =>
		parseLockedComponent(component, index, source),
	);
	assertUnique(
		components.map((component) => component.id),
		`${source}: component id is duplicated`,
	);

	if (!Array.isArray(record.outputs) || record.outputs.length === 0) {
		throw malformedState(`${source}: outputs must be a non-empty array`);
	}

	const outputs = record.outputs.map((output, index) =>
		parseLockedOutput(output, index, source),
	);
	validateOutputIdentities(outputs, source);

	const componentIds = new Set(components.map((component) => component.id));

	for (const output of outputs) {
		if (!componentIds.has(output.componentId)) {
			throw malformedState(
				`${source}: output references unlocked component ${output.componentId}`,
			);
		}
	}

	return {
		schemaVersion: 1,
		rendererVersion: 1,
		pack: {
			id: requireString(pack.id, "pack.id", source),
			version: requireString(pack.version, "pack.version", source),
			sha256: requireHash(pack.sha256, "pack.sha256", source),
			source: { kind: packSource.kind as PackSourceKind },
		},
		components,
		outputs,
	};
}

function parseLockedComponent(
	value: unknown,
	index: number,
	source: string,
): LockedComponent {
	const field = `components[${index}]`;
	const component = requireRecord(value, `${source}.${field}`);
	const kind = requireString(component.kind, `${field}.kind`, source);

	if (!COMPONENT_KINDS.has(kind as ComponentKind)) {
		throw malformedState(`${source}: ${field}.kind is not supported`);
	}

	return {
		id: requireString(component.id, `${field}.id`, source),
		kind: kind as ComponentKind,
		sha256: requireHash(component.sha256, `${field}.sha256`, source),
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

		return { ...base, kind: "file" };
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

function validateOutputIdentities(
	outputs: readonly LockedOutput[],
	source: string,
): void {
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
}

function requireTargets(
	value: unknown,
	field: string,
	source: string,
): AgentTarget[] {
	const values = requireUniqueStrings(value, field, source);

	for (const [index, target] of values.entries()) {
		if (!AGENT_TARGETS.has(target as AgentTarget)) {
			throw malformedState(
				`${source}: ${field}[${index}] is not a supported agent`,
			);
		}
	}

	return values as AgentTarget[];
}

function requireUniqueStrings(
	value: unknown,
	field: string,
	source: string,
): string[] {
	if (!Array.isArray(value) || value.length === 0) {
		throw malformedState(`${source}: ${field} must be a non-empty array`);
	}

	const values = value.map((item, index) =>
		requireString(item, `${field}[${index}]`, source),
	);
	assertUnique(values, `${source}: ${field} must not contain duplicates`);
	return values;
}

function assertUnique(values: readonly string[], message: string): void {
	if (new Set(values).size !== values.length) {
		throw malformedState(message);
	}
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
