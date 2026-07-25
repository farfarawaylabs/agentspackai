import { renderPack } from "../adapters/render.ts";
import {
	findManagedBlock,
	insertManagedBlock,
	replaceManagedBlock,
} from "../filesystem/managed-block.ts";
import { AgentsPackError } from "./errors.ts";
import { hashBytes } from "./hash.ts";
import {
	assertScopeAvailable,
	detectInstalledScope,
	inspectDesiredDestination,
	inspectLockedOutputs,
} from "./inspect.ts";
import { toPortablePath } from "./paths.ts";
import { serializeLockFile, serializeScopeConfig } from "./state.ts";
import type {
	AgentTarget,
	ChangeOperation,
	ChangePlan,
	DesiredOutput,
	InspectedOutput,
	LoadedPack,
	LockFile,
	LockedOutput,
	PathContext,
	Scope,
	ScopeConfig,
	ScopePaths,
} from "./types.ts";
import type { ScopeState } from "./inspect.ts";

const TARGET_ORDER: readonly AgentTarget[] = ["claude", "codex", "cursor"];

export interface InitPlanOptions {
	pack: LoadedPack;
	scope: Scope;
	targets: readonly AgentTarget[];
	context: PathContext;
}

export interface UpdatePlanOptions {
	pack: LoadedPack;
	context: PathContext;
}

export interface EjectPlanOptions {
	context: PathContext;
}

export async function planInit(options: InitPlanOptions): Promise<ChangePlan> {
	const targets = canonicalTargets(options.targets);
	const rendered = renderPack(options.pack, options.scope, targets);
	const state = await assertScopeAvailable(options.scope, options.context);

	if (state.status === "installed") {
		assertRepeatedInitMatches(
			state.config,
			state.lock,
			options.pack,
			targets,
			rendered.outputs,
		);
		const inspected = await inspectLockedOutputs(
			state.paths.root,
			options.scope,
			state.lock,
		);
		assertOutputsClean(inspected, "initialize");
		assertInstalledContentMatches(inspected, rendered.outputs);

		return {
			command: "init",
			scope: options.scope,
			operations: [],
			warnings: rendered.warnings,
		};
	}

	const operations: ChangeOperation[] = [];
	const lockedOutputs: LockedOutput[] = [];

	for (const desired of rendered.outputs) {
		const destination = await inspectDesiredDestination(
			state.paths.root,
			desired,
		);

		if (desired.kind === "file") {
			operations.push({
				kind: "create-file",
				path: desired.path,
				bytes: desired.bytes,
			});
			lockedOutputs.push(toLockedOutput(desired, hashBytes(desired.bytes)));
			continue;
		}

		const existingBytes = destination.existingBytes ?? new Uint8Array();
		const projected = insertManagedBlock(existingBytes, desired.bytes);
		const block = requireProjectedBlock(projected, desired.blockId);
		operations.push({
			kind: "insert-block",
			path: desired.path,
			blockId: desired.blockId,
			bytes: desired.bytes,
		});
		lockedOutputs.push(toLockedOutput(desired, hashBytes(block.ownedBytes)));
	}

	const config = createScopeConfig(options.scope, options.pack, targets);
	const lock = createLockFile(options.pack, lockedOutputs);
	operations.push(...createStateOperations(state.paths, config, lock));

	return createPlan("init", options.scope, operations, rendered.warnings);
}

export async function planUpdate(
	options: UpdatePlanOptions,
): Promise<ChangePlan> {
	const state = await detectInstalledScope(options.context);
	const { config, lock, paths } = requireInstalledState(state);

	if (options.pack.manifest.id !== config.packId) {
		throw new AgentsPackError(
			"INVALID_PACK",
			`Installed pack ${config.packId} cannot be updated with ${options.pack.manifest.id}.`,
		);
	}

	if (
		options.pack.manifest.version === lock.pack.version &&
		options.pack.sha256 !== lock.pack.sha256
	) {
		throw new AgentsPackError(
			"INVALID_PACK",
			`Pack version ${lock.pack.version} has different content; published pack versions are immutable.`,
		);
	}

	const inspected = await inspectLockedOutputs(paths.root, config.scope, lock);
	assertOutputsClean(inspected, "update");
	const rendered = renderPack(options.pack, config.scope, config.targets);
	const operations: ChangeOperation[] = [];
	const newLockedOutputs: LockedOutput[] = [];
	const oldByIdentity = new Map(
		inspected.map((inspection) => [
			outputIdentity(inspection.output),
			inspection,
		]),
	);
	const desiredIdentities = new Set(
		rendered.outputs.map((output) => outputIdentity(output)),
	);

	for (const inspection of inspected) {
		if (!desiredIdentities.has(outputIdentity(inspection.output))) {
			operations.push(removeOperation(inspection.output));
		}
	}

	for (const desired of rendered.outputs) {
		const old = oldByIdentity.get(outputIdentity(desired));

		if (old === undefined) {
			const destination = await inspectDesiredDestination(paths.root, desired);

			if (desired.kind === "file") {
				operations.push({
					kind: "create-file",
					path: desired.path,
					bytes: desired.bytes,
				});
				newLockedOutputs.push(
					toLockedOutput(desired, hashBytes(desired.bytes)),
				);
				continue;
			}

			const existingBytes = destination.existingBytes ?? new Uint8Array();
			const projected = insertManagedBlock(existingBytes, desired.bytes);
			const block = requireProjectedBlock(projected, desired.blockId);
			operations.push({
				kind: "insert-block",
				path: desired.path,
				blockId: desired.blockId,
				bytes: desired.bytes,
			});
			newLockedOutputs.push(
				toLockedOutput(desired, hashBytes(block.ownedBytes)),
			);
			continue;
		}

		if (desired.kind === "file" && old.output.kind === "file") {
			const desiredHash = hashBytes(desired.bytes);

			if (desiredHash !== old.output.sha256) {
				operations.push({
					kind: "replace-file",
					path: desired.path,
					bytes: desired.bytes,
				});
			}

			newLockedOutputs.push(toLockedOutput(desired, desiredHash));
			continue;
		}

		if (
			desired.kind === "managed-block" &&
			old.output.kind === "managed-block"
		) {
			const currentBytes = requireCurrentBytes(old);
			const currentBlockBytes = requireCurrentBlockBytes(old);
			const changed = !bytesEqual(currentBlockBytes, desired.bytes);
			const projected = changed
				? replaceManagedBlock(currentBytes, desired.bytes)
				: currentBytes;
			const block = requireProjectedBlock(projected, desired.blockId);

			if (changed) {
				operations.push({
					kind: "replace-block",
					path: desired.path,
					blockId: desired.blockId,
					bytes: desired.bytes,
				});
			}

			newLockedOutputs.push(
				toLockedOutput(desired, hashBytes(block.ownedBytes)),
			);
			continue;
		}

		throw new AgentsPackError(
			"MALFORMED_STATE",
			`Managed output changed kind without changing identity: ${desired.path}`,
		);
	}

	const newConfig = createScopeConfig(
		config.scope,
		options.pack,
		config.targets,
	);
	const newLock = createLockFile(options.pack, newLockedOutputs);

	if (!scopeConfigsEqual(config, newConfig)) {
		operations.push({
			kind: "replace-file",
			path: toPortablePath(paths.root, paths.configPath),
			bytes: serializeScopeConfig(newConfig),
		});
	}

	if (!lockFilesEqual(lock, newLock)) {
		operations.push({
			kind: "replace-file",
			path: toPortablePath(paths.root, paths.lockPath),
			bytes: serializeLockFile(newLock),
		});
	}

	return createPlan("update", config.scope, operations, rendered.warnings);
}

export async function planEject(
	options: EjectPlanOptions,
): Promise<ChangePlan> {
	const state = await detectInstalledScope(options.context);
	const { config, lock, paths } = requireInstalledState(state);
	const inspected = await inspectLockedOutputs(paths.root, config.scope, lock);
	assertOutputsClean(inspected, "eject");

	const operations = inspected
		.map((inspection) => removeOperation(inspection.output))
		.sort(compareOperations);

	operations.push(
		{
			kind: "remove-file",
			path: toPortablePath(paths.root, paths.configPath),
		},
		{
			kind: "remove-file",
			path: toPortablePath(paths.root, paths.lockPath),
		},
		{
			kind: "remove-empty-directory",
			path: toPortablePath(paths.root, paths.transactionsDirectory),
		},
		{
			kind: "remove-empty-directory",
			path: toPortablePath(paths.root, paths.stateDirectory),
		},
	);

	return {
		command: "eject",
		scope: config.scope,
		operations,
		warnings: [],
	};
}

function createPlan(
	command: ChangePlan["command"],
	scope: Scope,
	operations: ChangeOperation[],
	warnings: string[],
): ChangePlan {
	const stateOperations = operations.filter(isStateOperation);
	const contentOperations = operations
		.filter((operation) => !isStateOperation(operation))
		.sort(compareOperations);

	return {
		command,
		scope,
		operations: [...contentOperations, ...stateOperations],
		warnings: [...warnings],
	};
}

function createStateOperations(
	paths: ScopePaths,
	config: ScopeConfig,
	lock: LockFile,
): ChangeOperation[] {
	return [
		{
			kind: "create-file",
			path: toPortablePath(paths.root, paths.configPath),
			bytes: serializeScopeConfig(config),
		},
		{
			kind: "create-file",
			path: toPortablePath(paths.root, paths.lockPath),
			bytes: serializeLockFile(lock),
		},
	];
}

function createScopeConfig(
	scope: Scope,
	pack: LoadedPack,
	targets: AgentTarget[],
): ScopeConfig {
	return {
		schemaVersion: 1,
		scope,
		packId: pack.manifest.id,
		packVersion: pack.manifest.version,
		targets,
	};
}

function createLockFile(pack: LoadedPack, outputs: LockedOutput[]): LockFile {
	return {
		schemaVersion: 1,
		pack: {
			id: pack.manifest.id,
			version: pack.manifest.version,
			sha256: pack.sha256,
		},
		outputs: [...outputs].sort(compareLockedOutputs),
	};
}

function toLockedOutput(desired: DesiredOutput, sha256: string): LockedOutput {
	if (desired.kind === "managed-block") {
		return {
			kind: "managed-block",
			componentId: desired.componentId,
			adapter: "codex",
			path: desired.path,
			blockId: desired.blockId,
			sha256,
		};
	}

	return {
		kind: "file",
		componentId: desired.componentId,
		adapter: desired.adapter,
		path: desired.path,
		sha256,
	};
}

function assertRepeatedInitMatches(
	config: ScopeConfig,
	lock: LockFile,
	pack: LoadedPack,
	targets: readonly AgentTarget[],
	desired: readonly DesiredOutput[],
): void {
	if (
		config.packId !== pack.manifest.id ||
		config.packVersion !== pack.manifest.version ||
		lock.pack.sha256 !== pack.sha256 ||
		!arraysEqual(config.targets, targets)
	) {
		throw new AgentsPackError(
			"USAGE",
			"Agents Pack is already initialized with different settings; use update or eject first.",
		);
	}

	const desiredIdentities = desired.map(outputIdentity).sort();
	const lockedIdentities = lock.outputs.map(outputIdentity).sort();

	if (!arraysEqual(desiredIdentities, lockedIdentities)) {
		throw new AgentsPackError(
			"MALFORMED_STATE",
			"Installed lockfile outputs do not match the configured pack and targets.",
		);
	}
}

function assertInstalledContentMatches(
	inspected: readonly InspectedOutput[],
	desired: readonly DesiredOutput[],
): void {
	const desiredByIdentity = new Map(
		desired.map((output) => [outputIdentity(output), output]),
	);

	for (const inspection of inspected) {
		const expected = desiredByIdentity.get(outputIdentity(inspection.output));

		if (expected === undefined) {
			throw new AgentsPackError(
				"MALFORMED_STATE",
				`Locked output is not rendered by the installed pack: ${inspection.output.path}`,
			);
		}

		const current =
			expected.kind === "managed-block"
				? inspection.blockBytes
				: inspection.currentBytes;

		if (current === undefined || !bytesEqual(current, expected.bytes)) {
			throw new AgentsPackError(
				"DRIFT",
				`Installed output does not match the selected pack: ${expected.path}`,
			);
		}
	}
}

function assertOutputsClean(
	inspected: readonly InspectedOutput[],
	action: string,
): void {
	const problem = inspected.find((output) => output.status !== "clean");

	if (problem !== undefined) {
		throw new AgentsPackError(
			"DRIFT",
			`Cannot ${action}: managed output is ${problem.status}: ${problem.output.path}`,
		);
	}
}

function requireProjectedBlock(
	bytes: Uint8Array,
	blockId: string,
): NonNullable<ReturnType<typeof findManagedBlock>> {
	const block = findManagedBlock(bytes);

	if (block === undefined || block.blockId !== blockId) {
		throw new AgentsPackError(
			"MALFORMED_STATE",
			`Projected managed block is missing or has the wrong ID: ${blockId}`,
		);
	}

	return block;
}

function requireCurrentBytes(inspection: InspectedOutput): Uint8Array {
	if (inspection.currentBytes === undefined) {
		throw new AgentsPackError(
			"MALFORMED_STATE",
			`Clean output has no inspected bytes: ${inspection.output.path}`,
		);
	}

	return inspection.currentBytes;
}

function requireCurrentBlockBytes(inspection: InspectedOutput): Uint8Array {
	if (inspection.blockBytes === undefined) {
		throw new AgentsPackError(
			"MALFORMED_STATE",
			`Clean managed block has no inspected block bytes: ${inspection.output.path}`,
		);
	}

	return inspection.blockBytes;
}

function removeOperation(output: LockedOutput): ChangeOperation {
	return output.kind === "managed-block"
		? {
				kind: "remove-block",
				path: output.path,
				blockId: output.blockId,
			}
		: { kind: "remove-file", path: output.path };
}

function outputIdentity(output: DesiredOutput | LockedOutput): string {
	return output.kind === "managed-block"
		? `managed-block:${output.path}#${output.blockId}`
		: `file:${output.path}`;
}

function canonicalTargets(targets: readonly AgentTarget[]): AgentTarget[] {
	const selected = new Set(targets);
	const canonical = TARGET_ORDER.filter((target) => selected.has(target));

	if (selected.size !== targets.length) {
		throw new AgentsPackError(
			"USAGE",
			"Agent targets must not contain duplicates.",
		);
	}

	if (canonical.length !== targets.length) {
		throw new AgentsPackError(
			"UNSUPPORTED",
			"An agent target is not supported.",
		);
	}

	return canonical;
}

function compareLockedOutputs(left: LockedOutput, right: LockedOutput): number {
	return compareStrings(outputIdentity(left), outputIdentity(right));
}

function compareOperations(
	left: ChangeOperation,
	right: ChangeOperation,
): number {
	const pathComparison = compareStrings(left.path, right.path);
	return pathComparison !== 0
		? pathComparison
		: compareStrings(left.kind, right.kind);
}

function compareStrings(left: string, right: string): number {
	if (left < right) {
		return -1;
	}

	if (left > right) {
		return 1;
	}

	return 0;
}

function isStateOperation(operation: ChangeOperation): boolean {
	return (
		operation.path === ".agents-pack/pack.toml" ||
		operation.path === ".agents-pack/config.toml" ||
		operation.path === ".agents-pack/lock.json"
	);
}

function scopeConfigsEqual(left: ScopeConfig, right: ScopeConfig): boolean {
	return (
		left.schemaVersion === right.schemaVersion &&
		left.scope === right.scope &&
		left.packId === right.packId &&
		left.packVersion === right.packVersion &&
		arraysEqual(left.targets, right.targets)
	);
}

function lockFilesEqual(left: LockFile, right: LockFile): boolean {
	if (
		left.schemaVersion !== right.schemaVersion ||
		left.pack.id !== right.pack.id ||
		left.pack.version !== right.pack.version ||
		left.pack.sha256 !== right.pack.sha256 ||
		left.outputs.length !== right.outputs.length
	) {
		return false;
	}

	const rightByIdentity = new Map(
		right.outputs.map((output) => [outputIdentity(output), output]),
	);

	return left.outputs.every((output) => {
		const candidate = rightByIdentity.get(outputIdentity(output));

		return (
			candidate !== undefined &&
			output.kind === candidate.kind &&
			output.componentId === candidate.componentId &&
			output.adapter === candidate.adapter &&
			output.path === candidate.path &&
			output.sha256 === candidate.sha256 &&
			(output.kind !== "managed-block" ||
				(candidate.kind === "managed-block" &&
					output.blockId === candidate.blockId))
		);
	});
}

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
	return (
		left.length === right.length &&
		left.every((value, index) => value === right[index])
	);
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
	return (
		left.byteLength === right.byteLength &&
		left.every((byte, index) => byte === right[index])
	);
}

function requireInstalledState(
	state: ScopeState,
): Extract<ScopeState, { status: "installed" }> {
	if (state.status !== "installed") {
		throw new AgentsPackError(
			"NOT_INITIALIZED",
			"Agents Pack is not initialized.",
		);
	}

	return state;
}
