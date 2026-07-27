import { lstat } from "node:fs/promises";
import { renderPack } from "../adapters/render.ts";
import { AgentsPackError } from "./errors.ts";
import { detectInstalledScope, inspectLockedOutputs } from "./inspect.ts";
import {
	assertOutputsClean,
	createInitialOutputs,
	createLockFile,
	createPlan,
	lockFilesEqual,
	outputIdentity,
	reconcileOutputs,
} from "./plan.ts";
import { resolveContainedPath, toPortablePath } from "./paths.ts";
import { loadLockFileIfExists, serializeLockFile } from "./state.ts";
import type {
	ChangeOperation,
	ChangePlan,
	LoadedPack,
	LockFile,
	LockedOutput,
	PathContext,
	ScopePaths,
} from "./types.ts";
import {
	addUserComponent,
	forkUserComponent,
	loadUserPack,
	serializeUserManifest,
	type UserComponentKind,
	USER_PACK_ID,
} from "./user-components.ts";

export interface CreateUserComponentPlanOptions {
	officialPack: LoadedPack;
	kind: UserComponentKind;
	name: string;
	description: string;
	workspaceWrite?: boolean;
	context: PathContext;
}

export interface ForkUserComponentPlanOptions {
	officialPack: LoadedPack;
	componentId: string;
	name: string;
	context: PathContext;
}

export interface SyncUserComponentsPlanOptions {
	context: PathContext;
}

export async function planCreateUserComponent(
	options: CreateUserComponentPlanOptions,
): Promise<ChangePlan> {
	const state = requireInstalled(await detectInstalledScope(options.context));
	assertNoOfficialName(options.officialPack, options.name);
	const existing = await loadUserPack(state.paths);
	const next = addUserComponent(existing, options);

	return planUserPackTransition(
		"create",
		state.paths,
		state.config.scope,
		state.config.targets,
		state.lock,
		existing,
		next,
	);
}

export async function planForkUserComponent(
	options: ForkUserComponentPlanOptions,
): Promise<ChangePlan> {
	const state = requireInstalled(await detectInstalledScope(options.context));
	assertNoOfficialName(options.officialPack, options.name);
	const component = options.officialPack.manifest.components.find(
		(candidate) => candidate.id === options.componentId,
	);

	if (component === undefined) {
		throw new AgentsPackError(
			"UNKNOWN_COMPONENT",
			`Unknown official component: ${options.componentId}`,
		);
	}

	const existing = await loadUserPack(state.paths);
	const next = forkUserComponent(
		existing,
		options.officialPack,
		component,
		options.name,
	);

	return planUserPackTransition(
		"fork",
		state.paths,
		state.config.scope,
		state.config.targets,
		state.lock,
		existing,
		next,
	);
}

export async function planSyncUserComponents(
	options: SyncUserComponentsPlanOptions,
): Promise<ChangePlan> {
	const state = requireInstalled(await detectInstalledScope(options.context));
	const pack = await loadUserPack(state.paths);

	if (pack === undefined) {
		throw new AgentsPackError(
			"USAGE",
			"No user-owned components exist in this Agents Pack scope.",
			{ exitCode: 2 },
		);
	}

	return planUserPackTransition(
		"sync",
		state.paths,
		state.config.scope,
		state.config.targets,
		state.lock,
		pack,
		pack,
	);
}

async function planUserPackTransition(
	command: "create" | "fork" | "sync",
	paths: ScopePaths,
	scope: "global" | "repository",
	targets: readonly ("claude" | "codex" | "cursor")[],
	officialLock: LockFile,
	existingPack: LoadedPack | undefined,
	nextPack: LoadedPack,
): Promise<ChangePlan> {
	const oldUserLock = await loadLockFileIfExists(paths.userLockPath);

	if (oldUserLock !== undefined && oldUserLock.pack.id !== USER_PACK_ID) {
		throw new AgentsPackError(
			"MALFORMED_STATE",
			`User lockfile must identify ${USER_PACK_ID}.`,
		);
	}

	const rendered = renderPack(
		nextPack,
		scope,
		targets,
		nextPack.manifest.components.map((component) => component.id),
	);
	assertNoOfficialOutputCollisions(officialLock, rendered.outputs);
	const sourceOperations =
		command === "sync"
			? []
			: await createUserSourceOperations(paths, existingPack, nextPack);
	let outputOperations: ChangeOperation[];
	let lockedOutputs: LockedOutput[];

	if (oldUserLock === undefined) {
		const initial = await createInitialOutputs(paths, rendered.outputs);
		outputOperations = initial.operations;
		lockedOutputs = initial.lockedOutputs;
	} else {
		const inspected = await inspectLockedOutputs(
			paths.root,
			scope,
			oldUserLock,
		);
		assertOutputsClean(inspected, command);
		const reconciled = await reconcileOutputs(
			paths,
			inspected,
			rendered.outputs,
		);
		outputOperations = reconciled.operations;
		lockedOutputs = reconciled.lockedOutputs;
	}

	const nextLock = createLockFile(nextPack, rendered, lockedOutputs);
	const nextLockBytes = serializeLockFile(nextLock);
	const lockOperations: ChangeOperation[] =
		oldUserLock !== undefined && lockFilesEqual(oldUserLock, nextLock)
			? []
			: [
					{
						kind: oldUserLock === undefined ? "create-file" : "replace-file",
						path: toPortablePath(paths.root, paths.userLockPath),
						bytes: nextLockBytes,
					},
				];

	return createPlan(
		command,
		scope,
		[...sourceOperations, ...outputOperations, ...lockOperations],
		rendered.warnings,
	);
}

async function createUserSourceOperations(
	paths: ScopePaths,
	existingPack: LoadedPack | undefined,
	nextPack: LoadedPack,
): Promise<ChangeOperation[]> {
	const oldPaths = new Set(existingPack?.files.map((file) => file.path) ?? []);
	const operations: ChangeOperation[] = [];

	for (const file of nextPack.files) {
		if (file.path === "pack.toml" || oldPaths.has(file.path)) {
			continue;
		}

		const portablePath = `.agents-pack/user/${file.path}`;
		const absolutePath = await resolveContainedPath(paths.root, portablePath, {
			label: `User component source ${portablePath}`,
			rejectFinalSymlink: true,
		});

		if (await exists(absolutePath)) {
			throw new AgentsPackError(
				"OWNERSHIP_CONFLICT",
				`User component source already exists but is not registered: ${portablePath}`,
			);
		}

		operations.push({
			kind: "create-file",
			path: portablePath,
			bytes: file.bytes,
		});
	}

	operations.push({
		kind: existingPack === undefined ? "create-file" : "replace-file",
		path: toPortablePath(paths.root, paths.userManifestPath),
		bytes: serializeUserManifest(nextPack.manifest),
	});

	return operations;
}

function assertNoOfficialName(pack: LoadedPack, name: string): void {
	if (pack.manifest.components.some((component) => component.id === name)) {
		throw new AgentsPackError(
			"USAGE",
			`User component ${name} conflicts with an official component name.`,
			{ exitCode: 2 },
		);
	}
}

function assertNoOfficialOutputCollisions(
	officialLock: LockFile,
	userOutputs: ReturnType<typeof renderPack>["outputs"],
): void {
	const official = new Set(officialLock.outputs.map(outputIdentity));
	const collision = userOutputs.find((output) =>
		official.has(outputIdentity(output)),
	);

	if (collision !== undefined) {
		throw new AgentsPackError(
			"OWNERSHIP_CONFLICT",
			`User component output conflicts with an official component: ${collision.path}`,
		);
	}
}

function requireInstalled(
	state: Awaited<ReturnType<typeof detectInstalledScope>>,
): Extract<typeof state, { status: "installed" }> {
	if (state.status !== "installed") {
		throw new AgentsPackError(
			"NOT_INITIALIZED",
			"Agents Pack is not initialized.",
		);
	}

	return state;
}

async function exists(path: string): Promise<boolean> {
	try {
		await lstat(path);
		return true;
	} catch (error) {
		if (
			error instanceof Error &&
			"code" in error &&
			(error as NodeJS.ErrnoException).code === "ENOENT"
		) {
			return false;
		}

		throw error;
	}
}
