import { lstat, readFile } from "node:fs/promises";
import { AgentsPackError } from "./errors.ts";
import { hashBytes } from "./hash.ts";
import { resolveContainedPath, resolveScopePaths } from "./paths.ts";
import { loadLockFile, loadScopeConfig } from "./state.ts";
import type {
	DesiredOutput,
	InspectedDestination,
	InspectedOutput,
	LockFile,
	LockedOutput,
	PathContext,
	Scope,
	ScopeConfig,
	ScopePaths,
} from "./types.ts";
import { findManagedBlock } from "../filesystem/managed-block.ts";

export type ScopeState =
	| { status: "absent"; paths: ScopePaths }
	| {
			status: "installed";
			paths: ScopePaths;
			config: ScopeConfig;
			lock: LockFile;
	  };

export async function inspectScopeState(
	paths: ScopePaths,
): Promise<ScopeState> {
	const [configInfo, lockInfo] = await Promise.all([
		lstatOrUndefined(paths.configPath),
		lstatOrUndefined(paths.lockPath),
	]);

	if (configInfo === undefined && lockInfo === undefined) {
		return { status: "absent", paths };
	}

	if (configInfo === undefined || lockInfo === undefined) {
		throw new AgentsPackError(
			"MALFORMED_STATE",
			`Agents Pack state is incomplete for ${paths.scope} scope; both configuration and lockfile are required.`,
		);
	}

	if (!configInfo.isFile() || !lockInfo.isFile()) {
		throw new AgentsPackError(
			"MALFORMED_STATE",
			`Agents Pack state paths must be regular files for ${paths.scope} scope.`,
		);
	}

	const [config, lock] = await Promise.all([
		loadScopeConfig(paths.configPath),
		loadLockFile(paths.lockPath),
	]);

	if (config.scope !== paths.scope) {
		throw new AgentsPackError(
			"MALFORMED_STATE",
			`Scope configuration declares ${config.scope} scope at the ${paths.scope} state path.`,
		);
	}

	if (
		config.packId !== lock.pack.id ||
		config.packVersion !== lock.pack.version
	) {
		throw new AgentsPackError(
			"MALFORMED_STATE",
			"Scope configuration and lockfile disagree about the installed pack.",
		);
	}

	return { status: "installed", paths, config, lock };
}

export async function detectInstalledScope(
	context: PathContext,
): Promise<ScopeState> {
	const [repositoryPaths, globalPaths] = await Promise.all([
		resolveScopePaths("repository", context),
		resolveScopePaths("global", context),
	]);
	const [repository, global] = await Promise.all([
		inspectScopeState(repositoryPaths),
		inspectScopeState(globalPaths),
	]);

	if (repository.status === "installed" && global.status === "installed") {
		throw new AgentsPackError(
			"SCOPE_CONFLICT",
			"Agents Pack is installed in both global and current-repository scope.",
		);
	}

	if (repository.status === "installed") {
		return repository;
	}

	if (global.status === "installed") {
		return global;
	}

	throw new AgentsPackError(
		"NOT_INITIALIZED",
		"Agents Pack is not initialized in global or current-repository scope.",
	);
}

export async function assertScopeAvailable(
	requestedScope: Scope,
	context: PathContext,
): Promise<ScopeState> {
	const requestedPaths = await resolveScopePaths(requestedScope, context);
	const otherScope: Scope =
		requestedScope === "repository" ? "global" : "repository";
	const otherPaths = await resolveScopePaths(otherScope, context);
	const [requested, other] = await Promise.all([
		inspectScopeState(requestedPaths),
		inspectScopeState(otherPaths),
	]);

	if (other.status === "installed") {
		throw new AgentsPackError(
			"SCOPE_CONFLICT",
			`Agents Pack is already installed in ${otherScope} scope.`,
		);
	}

	return requested;
}

export async function inspectLockedOutputs(
	root: string,
	scope: Scope,
	lock: LockFile,
): Promise<InspectedOutput[]> {
	const inspections: InspectedOutput[] = [];

	for (const output of lock.outputs) {
		assertOwnedOutputPath(output, scope);
		const absolutePath = await resolveContainedPath(root, output.path, {
			label: `Locked output ${output.path}`,
			rejectFinalSymlink: true,
		});
		const info = await lstatOrUndefined(absolutePath);

		if (info === undefined) {
			inspections.push({ output, status: "missing" });
			continue;
		}

		if (!info.isFile()) {
			inspections.push({ output, status: "modified" });
			continue;
		}

		const currentBytes = new Uint8Array(await readFile(absolutePath));

		if (output.kind === "file") {
			const currentHash = hashBytes(currentBytes);
			inspections.push({
				output,
				status: currentHash === output.sha256 ? "clean" : "modified",
				currentHash,
				currentBytes,
			});
			continue;
		}

		try {
			const block = findManagedBlock(currentBytes);

			if (block === undefined) {
				inspections.push({ output, status: "missing", currentBytes });
				continue;
			}

			if (block.blockId !== output.blockId) {
				inspections.push({ output, status: "malformed", currentBytes });
				continue;
			}

			const currentHash = hashBytes(block.ownedBytes);
			inspections.push({
				output,
				status: currentHash === output.sha256 ? "clean" : "modified",
				currentHash,
				currentBytes,
				blockBytes: block.blockBytes,
			});
		} catch (error) {
			if (error instanceof AgentsPackError) {
				inspections.push({ output, status: "malformed", currentBytes });
				continue;
			}

			throw error;
		}
	}

	return inspections;
}

export async function inspectDesiredDestination(
	root: string,
	desired: DesiredOutput,
): Promise<InspectedDestination> {
	const absolutePath = await resolveContainedPath(root, desired.path, {
		label: `Desired output ${desired.path}`,
		rejectFinalSymlink: true,
	});
	const info = await lstatOrUndefined(absolutePath);

	if (info === undefined) {
		return { desired, status: "absent" };
	}

	if (!info.isFile()) {
		throw new AgentsPackError(
			"OWNERSHIP_CONFLICT",
			`Managed destination is not a regular file: ${desired.path}`,
		);
	}

	if (desired.kind === "file") {
		throw new AgentsPackError(
			"OWNERSHIP_CONFLICT",
			`An unowned file already exists at managed destination: ${desired.path}`,
		);
	}

	const existingBytes = new Uint8Array(await readFile(absolutePath));
	let block: ReturnType<typeof findManagedBlock>;

	try {
		block = findManagedBlock(existingBytes);
	} catch (cause) {
		throw new AgentsPackError(
			"OWNERSHIP_CONFLICT",
			`The shared managed destination contains malformed Agents Pack markers: ${desired.path}`,
			{ cause },
		);
	}

	if (block !== undefined) {
		throw new AgentsPackError(
			"OWNERSHIP_CONFLICT",
			`An unowned Agents Pack block already exists at managed destination: ${desired.path}`,
		);
	}

	return { desired, status: "shared-file", existingBytes };
}

function assertOwnedOutputPath(output: LockedOutput, scope: Scope): void {
	if (output.kind === "managed-block") {
		const expectedPath = scope === "global" ? ".codex/AGENTS.md" : "AGENTS.md";

		if (output.path !== expectedPath) {
			throw malformedOwnedPath(output.path, output.adapter);
		}

		return;
	}

	const prefixes: Record<LockedOutput["adapter"], readonly string[]> = {
		claude: [
			".claude/agents/",
			".claude/rules/agents-pack/",
			".claude/skills/",
		],
		codex: [".agents/skills/", ".codex/agents/"],
		cursor: [
			".cursor/agents/",
			".cursor/rules/agents-pack/",
			".cursor/skills/",
		],
	};

	if (
		!prefixes[output.adapter].some((prefix) => output.path.startsWith(prefix))
	) {
		throw malformedOwnedPath(output.path, output.adapter);
	}
}

function malformedOwnedPath(
	path: string,
	adapter: LockedOutput["adapter"],
): AgentsPackError {
	return new AgentsPackError(
		"MALFORMED_STATE",
		`Lockfile output is outside the ${adapter} adapter's managed paths: ${path}`,
	);
}

async function lstatOrUndefined(
	path: string,
): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
	try {
		return await lstat(path);
	} catch (error) {
		if (
			isNodeError(error) &&
			(error.code === "ENOENT" || error.code === "ENOTDIR")
		) {
			return undefined;
		}

		throw error;
	}
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error;
}
