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
const COMPONENT_SELECTIONS = new Set<PackComponent["selection"]>([
	"required",
	"recommended",
	"optional",
]);
const SAFE_SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const SAFE_CATEGORY =
	/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/;

type UnknownRecord = Record<string, unknown>;

export async function loadPack(packRoot: string): Promise<LoadedPack> {
	const root = resolve(packRoot);
	const manifest = await loadPackManifest(root);
	await validateComponentSources(root, manifest);
	const files = await collectPackFiles(root);
	const pack = {
		root,
		manifest,
		files,
		sha256: hashPackFiles(files),
	};
	validateLoadedPackSources(pack);
	return pack;
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

export function loadPackFromFiles(
	files: readonly PackFile[],
	rootLabel: string,
): LoadedPack {
	const canonicalFiles = files
		.map((file) => ({
			path: validatePortableRelativePath(file.path, "Cached pack file path"),
			bytes: file.bytes.slice(),
			sha256: file.sha256,
		}))
		.sort((left, right) => comparePaths(left.path, right.path));
	const manifestFile = canonicalFiles.find((file) => file.path === "pack.toml");

	if (manifestFile === undefined) {
		throw invalidPack("Cached pack is missing pack.toml.");
	}

	for (const file of canonicalFiles) {
		if (hashBytes(file.bytes) !== file.sha256) {
			throw invalidPack(`Cached pack file hash does not match: ${file.path}`);
		}
	}

	let parsed: unknown;

	try {
		parsed = Bun.TOML.parse(new TextDecoder().decode(manifestFile.bytes));
	} catch (cause) {
		throw invalidPack("Unable to parse cached pack manifest.", { cause });
	}

	const pack: LoadedPack = {
		root: rootLabel,
		manifest: validateManifest(parsed, `${rootLabel}/pack.toml`),
		files: canonicalFiles,
		sha256: hashPackFiles(canonicalFiles),
	};
	validateLoadedPackSources(pack);
	return pack;
}

function validateLoadedPackSources(pack: LoadedPack): void {
	for (const component of pack.manifest.components) {
		const sourcePrefix = `${component.source}/`;
		const sourceFiles = pack.files.filter(
			(file) =>
				file.path === component.source || file.path.startsWith(sourcePrefix),
		);

		if (sourceFiles.length === 0) {
			throw invalidPack(`Component source does not exist: ${component.source}`);
		}

		if (component.kind === "instruction") {
			if (!sourceFiles.some((file) => file.path === component.source)) {
				throw invalidPack(
					`Instruction source must be a file: ${component.source}`,
				);
			}
			continue;
		}

		if (component.kind === "skill") {
			const skill = sourceFiles.find(
				(file) => file.path === `${component.source}/SKILL.md`,
			);

			if (skill === undefined) {
				throw invalidPack(
					`Skill source is missing SKILL.md: ${component.source}`,
				);
			}

			const name = parseSkillName(
				new TextDecoder().decode(skill.bytes),
				component,
			);

			if (name !== component.id) {
				throw invalidPack(
					`Skill component ID ${component.id} must match SKILL.md name ${name}.`,
				);
			}
			continue;
		}

		const profile = sourceFiles.find(
			(file) => file.path === `${component.source}/agent.toml`,
		);
		const instructions = sourceFiles.find(
			(file) => file.path === `${component.source}/instructions.md`,
		);

		if (profile === undefined || instructions === undefined) {
			throw invalidPack(
				`Subagent source must contain agent.toml and instructions.md: ${component.source}`,
			);
		}

		let parsed: unknown;

		try {
			parsed = Bun.TOML.parse(new TextDecoder().decode(profile.bytes));
		} catch (cause) {
			throw invalidPack(
				`Unable to parse subagent profile: ${component.source}/agent.toml`,
				{ cause },
			);
		}

		if (
			!isRecord(parsed) ||
			typeof parsed.name !== "string" ||
			parsed.name !== component.id
		) {
			throw invalidPack(
				`Subagent component ID ${component.id} must match agent.toml name.`,
			);
		}
	}
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

			const skillName = parseSkillName(
				await readFile(skillPath, "utf8"),
				component,
			);

			if (skillName !== component.id) {
				throw invalidPack(
					`Skill component ID ${component.id} must match SKILL.md name ${skillName}.`,
				);
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

			const profilePath = join(sourcePath, "agent.toml");
			let profile: unknown;

			try {
				profile = Bun.TOML.parse(await readFile(profilePath, "utf8"));
			} catch (cause) {
				throw invalidPack(
					`Unable to parse subagent profile: ${component.source}/agent.toml`,
					{ cause },
				);
			}

			const profileName =
				isRecord(profile) && typeof profile.name === "string"
					? profile.name
					: undefined;

			if (profileName !== component.id) {
				throw invalidPack(
					`Subagent component ID ${component.id} must match agent.toml name ${String(profileName)}.`,
				);
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

	if (value.schema_version !== 1) {
		throw invalidManifest(manifestPath, "schema_version must be 1");
	}

	const id = requireNonEmptyString(value.id, "id", manifestPath);
	const version = requireNonEmptyString(value.version, "version", manifestPath);
	const title = requireNonEmptyString(value.title, "title", manifestPath);

	if (!SAFE_SLUG.test(id)) {
		throw invalidManifest(
			manifestPath,
			"id must use lowercase letters, numbers, and hyphens",
		);
	}

	if (!Array.isArray(value.components) || value.components.length === 0) {
		throw invalidManifest(manifestPath, "components must be a non-empty array");
	}

	const components = value.components.map((component, index) =>
		validateComponent(component, index, manifestPath),
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
		schemaVersion: 1,
		id,
		version,
		title,
		components,
	};
}

function validateComponent(
	value: unknown,
	index: number,
	manifestPath: string,
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
	const title = requireNonEmptyString(
		value.title,
		`${field}.title`,
		manifestPath,
	);
	const summary = requireNonEmptyString(
		value.summary,
		`${field}.summary`,
		manifestPath,
	);
	const category = requireNonEmptyString(
		value.category,
		`${field}.category`,
		manifestPath,
	);
	const selection = requireNonEmptyString(
		value.selection,
		`${field}.selection`,
		manifestPath,
	);

	if (!SAFE_SLUG.test(id)) {
		throw invalidManifest(manifestPath, `${field}.id must be a lowercase slug`);
	}

	if (!SAFE_CATEGORY.test(category)) {
		throw invalidManifest(
			manifestPath,
			`${field}.category must be a lowercase slash-separated category`,
		);
	}

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

	if (!COMPONENT_SELECTIONS.has(selection as PackComponent["selection"])) {
		throw invalidManifest(
			manifestPath,
			`${field}.selection must be required, recommended, or optional`,
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
		title,
		summary,
		category,
		selection: selection as PackComponent["selection"],
		source,
		targets,
	};
}

function parseSkillName(source: string, component: PackComponent): string {
	const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

	if (frontmatter === null) {
		throw invalidPack(
			`Skill source is missing YAML frontmatter: ${component.source}/SKILL.md`,
		);
	}

	const nameLine = frontmatter[1]?.match(/^name:\s*(.+?)\s*$/m);
	const name = nameLine?.[1]?.replace(/^["']|["']$/g, "");

	if (name === undefined || !SAFE_SLUG.test(name)) {
		throw invalidPack(
			`Skill frontmatter name is missing or invalid: ${component.source}/SKILL.md`,
		);
	}

	return name;
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
