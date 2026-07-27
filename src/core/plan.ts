import { renderPack } from "../adapters/render.ts";
import { posix } from "node:path";
import {
	findManagedBlock,
	insertManagedBlock,
	replaceManagedBlock,
} from "../filesystem/managed-block.ts";
import { AgentsPackError } from "./errors.ts";
import { hashBytes, hashPackComponent } from "./hash.ts";
import {
	assertScopeAvailable,
	detectInstalledScope,
	inspectDesiredDestination,
	inspectLockedOutputs,
} from "./inspect.ts";
import { toPortablePath } from "./paths.ts";
import {
	loadLockFileIfExists,
	serializeLockFile,
	serializeScopeConfig,
} from "./state.ts";
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
	RenderedPack,
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
	components?: readonly string[];
	context: PathContext;
}

export interface UpdatePlanOptions {
	pack: LoadedPack;
	context: PathContext;
}

export interface ComponentPlanOptions {
	pack: LoadedPack;
	componentId: string;
	context: PathContext;
}

export interface EjectPlanOptions {
	context: PathContext;
}

export async function planInit(options: InitPlanOptions): Promise<ChangePlan> {
	const targets = canonicalTargets(options.targets);
	const rendered = renderPack(
		options.pack,
		options.scope,
		targets,
		options.components ??
			options.pack.manifest.components.map((component) => component.id),
	);
	const state = await assertScopeAvailable(options.scope, options.context);
	const selectedIds = rendered.components.map((component) => component.id);

	if (state.status === "installed") {
		assertRepeatedInitMatches(
			state.config,
			state.lock,
			options.pack,
			targets,
			selectedIds,
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

	const { operations, lockedOutputs } = await createInitialOutputs(
		state.paths,
		rendered.outputs,
	);
	const config = createScopeConfig(
		options.scope,
		options.pack,
		targets,
		selectedIds,
	);
	const lock = createLockFile(options.pack, rendered, lockedOutputs);
	operations.push(
		...createStateOperations(state.paths, config, lock, "create"),
	);

	return createPlan("init", options.scope, operations, rendered.warnings);
}

export async function planUpdate(
	options: UpdatePlanOptions,
): Promise<ChangePlan> {
	const state = await detectInstalledScope(options.context);
	const { config, lock, paths } = requireInstalledState(state);

	if (options.pack.manifest.id !== config.pack.id) {
		throw new AgentsPackError(
			"INVALID_PACK",
			`Installed pack ${config.pack.id} cannot be updated with ${options.pack.manifest.id}.`,
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

	return reconcileInstalled(
		"update",
		options.pack,
		config,
		lock,
		paths,
		config.components,
	);
}

export async function planInstall(
	options: ComponentPlanOptions,
): Promise<ChangePlan> {
	const state = await detectInstalledScope(options.context);
	const { config, lock, paths } = requireInstalledState(state);
	assertPackMatchesLock(options.pack, lock);
	const component = options.pack.manifest.components.find(
		(candidate) => candidate.id === options.componentId,
	);

	if (component === undefined) {
		throw new AgentsPackError(
			"UNKNOWN_COMPONENT",
			`Component ${options.componentId} is not available in the installed pack. Update the pack first if it was added later.`,
		);
	}

	const components = config.components.includes(options.componentId)
		? config.components
		: [...config.components, options.componentId];

	return reconcileInstalled(
		"install",
		options.pack,
		config,
		lock,
		paths,
		components,
	);
}

export async function planRemove(
	options: ComponentPlanOptions,
): Promise<ChangePlan> {
	const state = await detectInstalledScope(options.context);
	const { config, lock, paths } = requireInstalledState(state);
	assertPackMatchesLock(options.pack, lock);
	const component = options.pack.manifest.components.find(
		(candidate) => candidate.id === options.componentId,
	);

	if (component === undefined) {
		throw new AgentsPackError(
			"UNKNOWN_COMPONENT",
			`Unknown component: ${options.componentId}`,
		);
	}

	if (component.selection === "required") {
		throw new AgentsPackError(
			"USAGE",
			`Required component ${component.id} cannot be removed.`,
		);
	}

	return reconcileInstalled(
		"remove",
		options.pack,
		config,
		lock,
		paths,
		config.components.filter((id) => id !== options.componentId),
	);
}

export async function planEject(
	options: EjectPlanOptions,
): Promise<ChangePlan> {
	const state = await detectInstalledScope(options.context);
	const { config, lock, paths } = requireInstalledState(state);
	const userLock = await loadLockFileIfExists(paths.userLockPath);
	const [officialInspected, userInspected] = await Promise.all([
		inspectLockedOutputs(paths.root, config.scope, lock),
		userLock === undefined
			? Promise.resolve([])
			: inspectLockedOutputs(paths.root, config.scope, userLock),
	]);
	const inspected = [...officialInspected, ...userInspected];
	assertOutputsClean(inspected, "eject");

	const operations = inspected
		.map((inspection) => removeOperation(inspection.output))
		.sort(compareOperations);
	operations.push(
		...emptyComponentDirectoryOperations(
			inspected.map((inspection) => inspection.output),
		),
	);

	operations.push(
		{
			kind: "remove-file",
			path: toPortablePath(paths.root, paths.configPath),
		},
		{
			kind: "remove-file",
			path: toPortablePath(paths.root, paths.lockPath),
		},
		...(userLock === undefined
			? []
			: [
					{
						kind: "remove-file" as const,
						path: toPortablePath(paths.root, paths.userLockPath),
					},
				]),
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
		warnings:
			userLock === undefined
				? []
				: [
						"User-owned canonical sources under .agents-pack/user are preserved.",
					],
	};
}

async function reconcileInstalled(
	command: "update" | "install" | "remove",
	pack: LoadedPack,
	config: ScopeConfig,
	lock: LockFile,
	paths: ScopePaths,
	componentIds: readonly string[],
): Promise<ChangePlan> {
	const inspected = await inspectLockedOutputs(paths.root, config.scope, lock);
	assertOutputsClean(inspected, command);
	const rendered = renderPack(pack, config.scope, config.targets, componentIds);
	const { operations, lockedOutputs } = await reconcileOutputs(
		paths,
		inspected,
		rendered.outputs,
	);
	const selectedIds = rendered.components.map((component) => component.id);
	const newConfig = createScopeConfig(
		config.scope,
		pack,
		config.targets,
		selectedIds,
	);
	const newLock = createLockFile(pack, rendered, lockedOutputs);

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

	return createPlan(command, config.scope, operations, rendered.warnings);
}

export async function createInitialOutputs(
	paths: ScopePaths,
	outputs: readonly DesiredOutput[],
): Promise<{ operations: ChangeOperation[]; lockedOutputs: LockedOutput[] }> {
	const operations: ChangeOperation[] = [];
	const lockedOutputs: LockedOutput[] = [];

	for (const desired of outputs) {
		const destination = await inspectDesiredDestination(paths.root, desired);

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

	return { operations, lockedOutputs };
}

export async function reconcileOutputs(
	paths: ScopePaths,
	inspected: readonly InspectedOutput[],
	desiredOutputs: readonly DesiredOutput[],
): Promise<{ operations: ChangeOperation[]; lockedOutputs: LockedOutput[] }> {
	const operations: ChangeOperation[] = [];
	const lockedOutputs: LockedOutput[] = [];
	const oldByIdentity = new Map(
		inspected.map((inspection) => [
			outputIdentity(inspection.output),
			inspection,
		]),
	);
	const desiredIdentities = new Set(
		desiredOutputs.map((output) => outputIdentity(output)),
	);

	for (const inspection of inspected) {
		if (!desiredIdentities.has(outputIdentity(inspection.output))) {
			operations.push(removeOperation(inspection.output));
		}
	}

	operations.push(
		...emptyComponentDirectoryOperations(
			inspected
				.filter(
					(inspection) =>
						!desiredIdentities.has(outputIdentity(inspection.output)),
				)
				.map((inspection) => inspection.output),
		),
	);

	for (const desired of desiredOutputs) {
		const old = oldByIdentity.get(outputIdentity(desired));

		if (old === undefined) {
			const destination = await inspectDesiredDestination(paths.root, desired);

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

			lockedOutputs.push(toLockedOutput(desired, desiredHash));
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

			lockedOutputs.push(toLockedOutput(desired, hashBytes(block.ownedBytes)));
			continue;
		}

		throw new AgentsPackError(
			"MALFORMED_STATE",
			`Managed output changed kind without changing identity: ${desired.path}`,
		);
	}

	return { operations, lockedOutputs };
}

export function createPlan(
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
	kind: "create" | "replace",
): ChangeOperation[] {
	return [
		{
			kind: `${kind}-file`,
			path: toPortablePath(paths.root, paths.configPath),
			bytes: serializeScopeConfig(config),
		},
		{
			kind: `${kind}-file`,
			path: toPortablePath(paths.root, paths.lockPath),
			bytes: serializeLockFile(lock),
		},
	];
}

function createScopeConfig(
	scope: Scope,
	pack: LoadedPack,
	targets: AgentTarget[],
	components: string[],
): ScopeConfig {
	return {
		schemaVersion: 1,
		scope,
		targets,
		components,
		pack: {
			id: pack.manifest.id,
			source: "local",
		},
	};
}

export function createLockFile(
	pack: LoadedPack,
	rendered: RenderedPack,
	outputs: LockedOutput[],
): LockFile {
	return {
		schemaVersion: 1,
		rendererVersion: 1,
		pack: {
			id: pack.manifest.id,
			version: pack.manifest.version,
			sha256: pack.sha256,
			source: { kind: "local" },
		},
		components: rendered.components.map((component) => ({
			id: component.id,
			kind: component.kind,
			sha256: hashPackComponent(pack, component),
		})),
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
	components: readonly string[],
	desired: readonly DesiredOutput[],
): void {
	if (
		config.pack.id !== pack.manifest.id ||
		lock.pack.version !== pack.manifest.version ||
		lock.pack.sha256 !== pack.sha256 ||
		!arraysEqual(config.targets, targets) ||
		!arraysEqual(config.components, components)
	) {
		throw new AgentsPackError(
			"USAGE",
			"Agents Pack is already initialized with different settings; use install, remove, update, or eject.",
		);
	}

	const desiredIdentities = desired.map(outputIdentity).sort();
	const lockedIdentities = lock.outputs.map(outputIdentity).sort();

	if (!arraysEqual(desiredIdentities, lockedIdentities)) {
		throw new AgentsPackError(
			"MALFORMED_STATE",
			"Installed lockfile outputs do not match the configured pack, targets, and components.",
		);
	}
}

function assertPackMatchesLock(pack: LoadedPack, lock: LockFile): void {
	if (
		pack.manifest.id !== lock.pack.id ||
		pack.manifest.version !== lock.pack.version ||
		pack.sha256 !== lock.pack.sha256
	) {
		throw new AgentsPackError(
			"INVALID_PACK",
			"The cached Base does not match the installed lockfile.",
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

export function assertOutputsClean(
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

function emptyComponentDirectoryOperations(
	outputs: readonly LockedOutput[],
): ChangeOperation[] {
	const skillRoots = [
		".claude/skills/",
		".agents/skills/",
		".cursor/skills/",
	] as const;
	const directories = new Set<string>();

	for (const output of outputs) {
		if (output.kind !== "file") {
			continue;
		}

		const skillRoot = skillRoots.find((root) => output.path.startsWith(root));

		if (skillRoot === undefined) {
			continue;
		}

		const relative = output.path.slice(skillRoot.length);
		const componentDirectory = relative.split("/")[0];

		if (componentDirectory === undefined || componentDirectory.length === 0) {
			continue;
		}

		const root = `${skillRoot}${componentDirectory}`;
		let directory = posix.dirname(output.path);

		while (directory === root || directory.startsWith(`${root}/`)) {
			directories.add(directory);

			if (directory === root) {
				break;
			}

			directory = posix.dirname(directory);
		}
	}

	return [...directories].map((path) => ({
		kind: "remove-empty-directory",
		path,
	}));
}

export function outputIdentity(output: DesiredOutput | LockedOutput): string {
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
	if (
		left.kind === "remove-empty-directory" &&
		right.kind !== "remove-empty-directory"
	) {
		return 1;
	}

	if (
		right.kind === "remove-empty-directory" &&
		left.kind !== "remove-empty-directory"
	) {
		return -1;
	}

	const pathComparison = compareStrings(left.path, right.path);
	return pathComparison !== 0
		? pathComparison
		: compareStrings(left.kind, right.kind);
}

function compareStrings(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function isStateOperation(operation: ChangeOperation): boolean {
	return (
		operation.path === ".agents-pack/pack.toml" ||
		operation.path === ".agents-pack/config.toml" ||
		operation.path === ".agents-pack/lock.json" ||
		operation.path === ".agents-pack/user-lock.json"
	);
}

function scopeConfigsEqual(left: ScopeConfig, right: ScopeConfig): boolean {
	return (
		left.schemaVersion === right.schemaVersion &&
		left.scope === right.scope &&
		left.pack.id === right.pack.id &&
		left.pack.source === right.pack.source &&
		arraysEqual(left.targets, right.targets) &&
		arraysEqual(left.components, right.components)
	);
}

export function lockFilesEqual(left: LockFile, right: LockFile): boolean {
	if (
		left.schemaVersion !== right.schemaVersion ||
		left.rendererVersion !== right.rendererVersion ||
		left.pack.id !== right.pack.id ||
		left.pack.version !== right.pack.version ||
		left.pack.sha256 !== right.pack.sha256 ||
		left.pack.source.kind !== right.pack.source.kind ||
		left.components.length !== right.components.length ||
		left.outputs.length !== right.outputs.length
	) {
		return false;
	}

	if (
		!left.components.every((component, index) => {
			const candidate = right.components[index];
			return (
				candidate !== undefined &&
				component.id === candidate.id &&
				component.kind === candidate.kind &&
				component.sha256 === candidate.sha256
			);
		})
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
