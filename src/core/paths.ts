import { lstat, realpath, stat } from "node:fs/promises";
import {
	dirname,
	isAbsolute,
	join,
	parse,
	relative,
	resolve,
	sep,
} from "node:path";
import { AgentsPackError } from "./errors.ts";
import type { PathContext, Scope, ScopePaths } from "./types.ts";

const WINDOWS_ABSOLUTE_PATH = /^[A-Za-z]:[\\/]/;

export function createPathContext(input: PathContext): PathContext {
	if (input.cwd.trim().length === 0) {
		throw new AgentsPackError(
			"USAGE",
			"The current directory cannot be empty.",
		);
	}

	if (input.userHome.trim().length === 0) {
		throw new AgentsPackError("USAGE", "The user home cannot be empty.");
	}

	return {
		cwd: resolve(input.cwd),
		userHome: resolve(input.userHome),
	};
}

export function validatePortableRelativePath(
	value: string,
	label = "Path",
): string {
	if (value.length === 0) {
		throw invalidPath(`${label} cannot be empty.`);
	}

	if (value.includes("\0")) {
		throw invalidPath(`${label} cannot contain a null byte.`);
	}

	if (
		value.includes("\\") ||
		isAbsolute(value) ||
		WINDOWS_ABSOLUTE_PATH.test(value)
	) {
		throw invalidPath(
			`${label} must be a relative path using forward slashes.`,
		);
	}

	const segments = value.split("/");

	if (
		segments.some(
			(segment) => segment.length === 0 || segment === "." || segment === "..",
		)
	) {
		throw invalidPath(
			`${label} must not contain empty, current-directory, or parent-directory segments.`,
		);
	}

	return value;
}

export async function findRepositoryRoot(cwd: string): Promise<string> {
	const start = resolve(cwd);
	const startStat = await stat(start).catch((cause: unknown) => {
		throw new AgentsPackError(
			"INVALID_PATH",
			`Unable to inspect working directory: ${start}`,
			{ cause },
		);
	});

	if (!startStat.isDirectory()) {
		throw invalidPath(`Working directory is not a directory: ${start}`);
	}

	let current = start;

	while (true) {
		if (await pathExists(join(current, ".git"))) {
			return current;
		}

		const parent = dirname(current);

		if (parent === current) {
			return start;
		}

		current = parent;
	}
}

export async function resolveScopePaths(
	scope: Scope,
	context: PathContext,
): Promise<ScopePaths> {
	const normalized = createPathContext(context);
	const root =
		scope === "repository"
			? await findRepositoryRoot(normalized.cwd)
			: await requireDirectory(normalized.userHome, "User home");
	const stateDirectory = join(root, ".agents-pack");
	const userDirectory = join(stateDirectory, "user");

	return {
		scope,
		root,
		stateDirectory,
		configPath: join(
			stateDirectory,
			scope === "global" ? "config.toml" : "pack.toml",
		),
		lockPath: join(stateDirectory, "lock.json"),
		userDirectory,
		userManifestPath: join(userDirectory, "pack.toml"),
		userLockPath: join(stateDirectory, "user-lock.json"),
		operationLockPath: join(root, ".agents-pack.operation.lock"),
		transactionsDirectory: join(stateDirectory, "transactions"),
	};
}

export async function resolveContainedPath(
	root: string,
	portableRelativePath: string,
	options: {
		label?: string;
		rejectFinalSymlink?: boolean;
	} = {},
): Promise<string> {
	const label = options.label ?? "Path";
	const relativePath = validatePortableRelativePath(
		portableRelativePath,
		label,
	);
	const absoluteRoot = await requireDirectory(root, "Containment root");
	const canonicalRoot = await realpath(absoluteRoot);
	const target = resolve(absoluteRoot, ...relativePath.split("/"));
	const lexicalRelative = relative(absoluteRoot, target);

	if (!isRelativeInside(lexicalRelative)) {
		throw invalidPath(`${label} escapes its allowed root.`);
	}

	const targetInfo = await lstatOrUndefined(target);

	if (targetInfo?.isSymbolicLink() && options.rejectFinalSymlink) {
		throw new AgentsPackError(
			"OWNERSHIP_CONFLICT",
			`${label} is a symbolic link and cannot be managed: ${target}`,
		);
	}

	const { existingAncestor, missingSegments } =
		await deepestExistingAncestor(target);
	const ancestorInfo = await stat(existingAncestor);

	if (missingSegments.length > 0 && !ancestorInfo.isDirectory()) {
		throw invalidPath(
			`${label} has a non-directory ancestor: ${existingAncestor}`,
		);
	}

	const canonicalAncestor = await realpath(existingAncestor);
	const canonicalTarget = resolve(canonicalAncestor, ...missingSegments);
	const canonicalRelative = relative(canonicalRoot, canonicalTarget);

	if (!isRelativeInside(canonicalRelative)) {
		throw invalidPath(
			`${label} resolves outside its allowed root: ${portableRelativePath}`,
		);
	}

	return target;
}

export function toPortablePath(root: string, absolutePath: string): string {
	const value = relative(resolve(root), resolve(absolutePath));

	if (!isRelativeInside(value) || value.length === 0) {
		throw invalidPath(`Path is not a child of its root: ${absolutePath}`);
	}

	return value.split(sep).join("/");
}

export function isPathInside(root: string, candidate: string): boolean {
	const value = relative(resolve(root), resolve(candidate));
	return value.length === 0 || isRelativeInside(value);
}

async function deepestExistingAncestor(target: string): Promise<{
	existingAncestor: string;
	missingSegments: string[];
}> {
	const missingSegments: string[] = [];
	let current = target;

	while (!(await pathExists(current))) {
		const parent = dirname(current);

		if (parent === current) {
			throw invalidPath(`No existing ancestor found for path: ${target}`);
		}

		missingSegments.unshift(parse(current).base);
		current = parent;
	}

	return {
		existingAncestor: current,
		missingSegments,
	};
}

async function requireDirectory(path: string, label: string): Promise<string> {
	const absolute = resolve(path);
	const info = await stat(absolute).catch((cause: unknown) => {
		throw new AgentsPackError(
			"INVALID_PATH",
			`${label} does not exist: ${absolute}`,
			{ cause },
		);
	});

	if (!info.isDirectory()) {
		throw invalidPath(`${label} is not a directory: ${absolute}`);
	}

	return absolute;
}

async function pathExists(path: string): Promise<boolean> {
	return (await lstatOrUndefined(path)) !== undefined;
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

function isRelativeInside(value: string): boolean {
	return value !== ".." && !value.startsWith(`..${sep}`) && !isAbsolute(value);
}

function invalidPath(message: string): AgentsPackError {
	return new AgentsPackError("INVALID_PATH", message);
}
