import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { AgentsPackError } from "./errors.ts";
import { hashBytes, hashPackFiles } from "./hash.ts";
import {
	isPathInside,
	resolveContainedPath,
	validatePortableRelativePath,
} from "./paths.ts";
import type {
	AgentTarget,
	LoadedPack,
	PackComponent,
	PackFile,
	PackManifest,
} from "./types.ts";

const AGENT_TARGETS = new Set<AgentTarget>(["claude", "codex", "cursor"]);
const COMPONENT_KINDS = new Set<PackComponent["kind"]>([
	"instruction",
	"skill",
	"subagent",
]);

type UnknownRecord = Record<string, unknown>;

export async function loadPack(packRoot: string): Promise<LoadedPack> {
	const root = resolve(packRoot);
	const manifest = await loadPackManifest(root);
	await validateComponentSources(root, manifest);
	const files = await collectPackFiles(root);

	return {
		root,
		manifest,
		files,
		sha256: hashPackFiles(files),
	};
}

export async function loadPackManifest(
	packRoot: string,
): Promise<PackManifest> {
	const root = resolve(packRoot);
	const manifestPath = join(root, "pack.toml");

	let source: string;

	try {
		source = await Bun.file(manifestPath).text();
	} catch (cause) {
		throw new AgentsPackError(
			"INVALID_PACK",
			`Unable to read pack manifest: ${manifestPath}`,
			{ cause },
		);
	}

	let parsed: unknown;

	try {
		parsed = Bun.TOML.parse(source);
	} catch (cause) {
		throw new AgentsPackError(
			"INVALID_PACK",
			`Unable to parse pack manifest: ${manifestPath}`,
			{ cause },
		);
	}

	return validateManifest(parsed, manifestPath);
}

async function validateComponentSources(
	root: string,
	manifest: PackManifest,
): Promise<void> {
	for (const component of manifest.components) {
		let sourcePath: string;

		try {
			sourcePath = await resolveContainedPath(root, component.source, {
				label: `Source for ${component.id}`,
			});
		} catch (cause) {
			throw invalidPack(
				`Invalid source for component ${component.id}: ${component.source}`,
				{ cause },
			);
		}

		const sourceInfo = await stat(sourcePath).catch((cause: unknown) => {
			throw invalidPack(
				`Component source does not exist: ${component.source}`,
				{ cause },
			);
		});

		if (component.kind === "instruction" && !sourceInfo.isFile()) {
			throw invalidPack(
				`Instruction source must be a file: ${component.source}`,
			);
		}

		if (component.kind === "skill") {
			if (!sourceInfo.isDirectory()) {
				throw invalidPack(
					`Skill source must be a directory: ${component.source}`,
				);
			}

			let skillPath: string;

			try {
				skillPath = await resolveContainedPath(
					root,
					`${component.source}/SKILL.md`,
					{ label: `SKILL.md for ${component.id}` },
				);
			} catch (cause) {
				throw invalidPack(
					`Invalid SKILL.md path for component ${component.id}`,
					{ cause },
				);
			}

			const skillInfo = await stat(skillPath).catch((cause: unknown) => {
				throw invalidPack(
					`Skill source is missing SKILL.md: ${component.source}`,
					{ cause },
				);
			});

			if (!skillInfo.isFile()) {
				throw invalidPack(`Skill SKILL.md must be a file: ${component.source}`);
			}
		}

		if (component.kind === "subagent") {
			if (!sourceInfo.isDirectory()) {
				throw invalidPack(
					`Subagent source must be a directory: ${component.source}`,
				);
			}

			for (const requiredFile of ["agent.toml", "instructions.md"]) {
				let requiredPath: string;

				try {
					requiredPath = await resolveContainedPath(
						root,
						`${component.source}/${requiredFile}`,
						{ label: `${requiredFile} for ${component.id}` },
					);
				} catch (cause) {
					throw invalidPack(
						`Invalid ${requiredFile} path for component ${component.id}`,
						{ cause },
					);
				}

				const requiredInfo = await stat(requiredPath).catch(
					(cause: unknown) => {
						throw invalidPack(
							`Subagent source is missing ${requiredFile}: ${component.source}`,
							{ cause },
						);
					},
				);

				if (!requiredInfo.isFile()) {
					throw invalidPack(
						`Subagent ${requiredFile} must be a file: ${component.source}`,
					);
				}
			}
		}
	}
}

async function collectPackFiles(root: string): Promise<PackFile[]> {
	try {
		const canonicalRoot = await realpath(root);
		const rootInfo = await stat(canonicalRoot);

		if (!rootInfo.isDirectory()) {
			throw invalidPack(`Pack root is not a directory: ${root}`);
		}

		const files: PackFile[] = [];
		await walkPackDirectory(root, root, canonicalRoot, new Set(), files);
		files.sort((left, right) => comparePaths(left.path, right.path));
		return files;
	} catch (error) {
		if (error instanceof AgentsPackError) {
			throw error;
		}

		throw invalidPack(`Unable to read pack files from: ${root}`, {
			cause: error,
		});
	}
}

async function walkPackDirectory(
	logicalRoot: string,
	logicalPath: string,
	canonicalRoot: string,
	activeDirectories: Set<string>,
	files: PackFile[],
): Promise<void> {
	const canonicalPath = await realpath(logicalPath);

	if (!isPathInside(canonicalRoot, canonicalPath)) {
		throw invalidPack(
			`Pack path resolves outside the pack root: ${logicalPath}`,
		);
	}

	const info = await stat(logicalPath);

	if (info.isDirectory()) {
		if (activeDirectories.has(canonicalPath)) {
			throw invalidPack(`Pack contains a symbolic-link cycle: ${logicalPath}`);
		}

		activeDirectories.add(canonicalPath);

		const entries = await readdir(logicalPath);
		entries.sort(comparePaths);

		for (const entry of entries) {
			await walkPackDirectory(
				logicalRoot,
				join(logicalPath, entry),
				canonicalRoot,
				activeDirectories,
				files,
			);
		}

		activeDirectories.delete(canonicalPath);
		return;
	}

	if (!info.isFile()) {
		const linkInfo = await lstat(logicalPath);
		const detail = linkInfo.isSymbolicLink()
			? "unresolved symbolic link"
			: "unsupported filesystem entry";
		throw invalidPack(`Pack contains ${detail}: ${logicalPath}`);
	}

	const bytes = new Uint8Array(await readFile(logicalPath));
	const portablePath = relative(logicalRoot, logicalPath).split(sep).join("/");

	files.push({
		path: portablePath,
		bytes,
		sha256: hashBytes(bytes),
	});
}

function validateManifest(value: unknown, manifestPath: string): PackManifest {
	if (!isRecord(value)) {
		throw invalidManifest(manifestPath, "the document must be a table");
	}

	if (value.schema_version !== 1 && value.schema_version !== 2) {
		throw invalidManifest(manifestPath, "schema_version must be 1 or 2");
	}

	const schemaVersion = value.schema_version;
	const id = requireNonEmptyString(value.id, "id", manifestPath);
	const version = requireNonEmptyString(value.version, "version", manifestPath);

	if (!Array.isArray(value.components) || value.components.length === 0) {
		throw invalidManifest(manifestPath, "components must be a non-empty array");
	}

	const components = value.components.map((component, index) =>
		validateComponent(component, index, manifestPath, schemaVersion),
	);
	const componentIds = new Set<string>();

	for (const component of components) {
		if (componentIds.has(component.id)) {
			throw invalidManifest(
				manifestPath,
				`component id is duplicated: ${component.id}`,
			);
		}

		componentIds.add(component.id);
	}

	return {
		schemaVersion,
		id,
		version,
		components,
	};
}

function validateComponent(
	value: unknown,
	index: number,
	manifestPath: string,
	schemaVersion: PackManifest["schemaVersion"],
): PackComponent {
	const field = `components[${index}]`;

	if (!isRecord(value)) {
		throw invalidManifest(manifestPath, `${field} must be a table`);
	}

	const id = requireNonEmptyString(value.id, `${field}.id`, manifestPath);
	const source = requireNonEmptyString(
		value.source,
		`${field}.source`,
		manifestPath,
	);
	const kind = requireNonEmptyString(value.kind, `${field}.kind`, manifestPath);

	try {
		validatePortableRelativePath(source, `${field}.source`);
	} catch (cause) {
		throw invalidManifest(
			manifestPath,
			`${field}.source must be a safe portable relative path`,
			cause,
		);
	}

	if (!COMPONENT_KINDS.has(kind as PackComponent["kind"])) {
		throw invalidManifest(
			manifestPath,
			`${field}.kind must be instruction, skill, or subagent`,
		);
	}

	if (schemaVersion === 1 && kind === "subagent") {
		throw invalidManifest(
			manifestPath,
			`${field}.kind subagent requires schema_version 2`,
		);
	}

	if (!Array.isArray(value.targets) || value.targets.length === 0) {
		throw invalidManifest(
			manifestPath,
			`${field}.targets must be a non-empty array`,
		);
	}

	const targets = value.targets.map((target, targetIndex) => {
		if (
			typeof target !== "string" ||
			!AGENT_TARGETS.has(target as AgentTarget)
		) {
			throw invalidManifest(
				manifestPath,
				`${field}.targets[${targetIndex}] is not a supported agent`,
			);
		}

		return target as AgentTarget;
	});

	if (new Set(targets).size !== targets.length) {
		throw invalidManifest(
			manifestPath,
			`${field}.targets must not contain duplicates`,
		);
	}

	return {
		id,
		kind: kind as PackComponent["kind"],
		source,
		targets,
	};
}

function requireNonEmptyString(
	value: unknown,
	field: string,
	manifestPath: string,
): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw invalidManifest(manifestPath, `${field} must be a non-empty string`);
	}

	return value;
}

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidManifest(
	manifestPath: string,
	reason: string,
	cause?: unknown,
): AgentsPackError {
	return new AgentsPackError(
		"INVALID_PACK",
		`Invalid pack manifest ${manifestPath}: ${reason}.`,
		{ cause },
	);
}

function invalidPack(
	reason: string,
	options: { cause?: unknown } = {},
): AgentsPackError {
	return new AgentsPackError("INVALID_PACK", reason, options);
}

function comparePaths(left: string, right: string): number {
	if (left < right) {
		return -1;
	}

	if (left > right) {
		return 1;
	}

	return 0;
}
