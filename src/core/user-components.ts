import { lstat } from "node:fs/promises";
import { AgentsPackError } from "./errors.ts";
import { hashBytes } from "./hash.ts";
import { loadPack, loadPackFromFiles } from "./pack.ts";
import type {
	AgentTarget,
	LoadedPack,
	PackComponent,
	PackFile,
	PackManifest,
	ScopePaths,
} from "./types.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const USER_COMPONENT_NAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const TARGETS: AgentTarget[] = ["claude", "codex", "cursor"];

export const USER_PACK_ID = "agents-pack-user";
export const USER_PACK_VERSION = "local";

export type UserComponentKind = "skill" | "subagent";

export interface NewUserComponent {
	kind: UserComponentKind;
	name: string;
	description: string;
	workspaceWrite?: boolean;
}

export async function loadUserPack(
	paths: ScopePaths,
): Promise<LoadedPack | undefined> {
	if (!(await isRegularFileOrMissing(paths.userManifestPath))) {
		return undefined;
	}

	const pack = await loadPack(paths.userDirectory);

	if (
		pack.manifest.id !== USER_PACK_ID ||
		pack.manifest.version !== USER_PACK_VERSION
	) {
		throw new AgentsPackError(
			"MALFORMED_STATE",
			`User component manifest must identify ${USER_PACK_ID}@${USER_PACK_VERSION}.`,
		);
	}

	if (
		pack.manifest.components.some(
			(component) =>
				component.kind === "instruction" ||
				component.selection !== "optional" ||
				component.id.startsWith("ap-"),
		)
	) {
		throw new AgentsPackError(
			"MALFORMED_STATE",
			"User component manifests may contain only optional, non-ap skill and subagent components.",
		);
	}

	return pack;
}

export function addUserComponent(
	existing: LoadedPack | undefined,
	input: NewUserComponent,
): LoadedPack {
	const name = validateUserComponentName(input.name);
	const description = requireDescription(input.description);
	assertNameAvailable(existing, name);
	const component = createComponent(input.kind, name, description);
	const sourceFiles =
		input.kind === "skill"
			? createSkillFiles(name, description)
			: createSubagentFiles(name, description, input.workspaceWrite ?? false);

	return buildUserPack(existing, component, sourceFiles);
}

export function forkUserComponent(
	existing: LoadedPack | undefined,
	officialPack: LoadedPack,
	officialComponent: PackComponent,
	newName: string,
): LoadedPack {
	if (
		officialComponent.kind !== "skill" &&
		officialComponent.kind !== "subagent"
	) {
		throw new AgentsPackError(
			"USAGE",
			`Only skills and subagents can be forked; ${officialComponent.id} is an instruction component.`,
			{ exitCode: 2 },
		);
	}

	const name = validateUserComponentName(newName);
	assertNameAvailable(existing, name);
	const oldPrefix = `${officialComponent.source}/`;
	const newSource = `${kindDirectory(officialComponent.kind)}/${name}`;
	const newPrefix = `${newSource}/`;
	const sourceFiles = officialPack.files
		.filter((file) => file.path.startsWith(oldPrefix))
		.map((file) => {
			const relativePath = file.path.slice(oldPrefix.length);
			return packFile(
				`${newPrefix}${relativePath}`,
				rewriteForkedFile(file.bytes, relativePath, officialComponent.id, name),
			);
		});
	const component: PackComponent = {
		id: name,
		kind: officialComponent.kind,
		title: titleFromName(name),
		summary: officialComponent.summary,
		category: `user/${kindDirectory(officialComponent.kind)}`,
		selection: "optional",
		source: newSource,
		targets: [...TARGETS],
	};

	return buildUserPack(existing, component, sourceFiles);
}

export function serializeUserManifest(manifest: PackManifest): Uint8Array {
	const lines = [
		"schema_version = 1",
		`id = ${quote(manifest.id)}`,
		`version = ${quote(manifest.version)}`,
		`title = ${quote(manifest.title)}`,
	];

	for (const component of manifest.components) {
		lines.push(
			"",
			"[[components]]",
			`id = ${quote(component.id)}`,
			`kind = ${quote(component.kind)}`,
			`title = ${quote(component.title)}`,
			`summary = ${quote(component.summary)}`,
			`category = ${quote(component.category)}`,
			`selection = ${quote(component.selection)}`,
			`source = ${quote(component.source)}`,
			`targets = [${component.targets.map(quote).join(", ")}]`,
		);
	}

	return encoder.encode(`${lines.join("\n")}\n`);
}

export function validateUserComponentName(value: string): string {
	const name = value.trim();

	if (!USER_COMPONENT_NAME.test(name)) {
		throw new AgentsPackError(
			"USAGE",
			"User component names must use lowercase letters, numbers, and hyphens.",
			{ exitCode: 2 },
		);
	}

	if (name.startsWith("ap-")) {
		throw new AgentsPackError(
			"USAGE",
			"User component names cannot use the reserved ap- prefix.",
			{ exitCode: 2 },
		);
	}

	return name;
}

function buildUserPack(
	existing: LoadedPack | undefined,
	component: PackComponent,
	sourceFiles: PackFile[],
): LoadedPack {
	const components = [...(existing?.manifest.components ?? []), component].sort(
		compareComponents,
	);
	const manifest: PackManifest = {
		schemaVersion: 1,
		id: USER_PACK_ID,
		version: USER_PACK_VERSION,
		title: "Agents Pack user components",
		components,
	};
	const files = [
		...(existing?.files.filter((file) => file.path !== "pack.toml") ?? []),
		...sourceFiles,
		packFile("pack.toml", serializeUserManifest(manifest)),
	];

	return loadPackFromFiles(files, existing?.root ?? ".agents-pack/user");
}

function createComponent(
	kind: UserComponentKind,
	name: string,
	description: string,
): PackComponent {
	return {
		id: name,
		kind,
		title: titleFromName(name),
		summary: description,
		category: `user/${kindDirectory(kind)}`,
		selection: "optional",
		source: `${kindDirectory(kind)}/${name}`,
		targets: [...TARGETS],
	};
}

function createSkillFiles(name: string, description: string): PackFile[] {
	const title = titleFromName(name);
	const shortDescription =
		description.length <= 64
			? description
			: `${description.slice(0, 61).trimEnd()}...`;
	const skill = `---
name: ${name}
description: ${quoteYaml(description)}
---

# ${title}

Replace this scaffold with concise instructions for the reusable workflow.
Keep the frontmatter name unchanged, make the description explain both what
the skill does and when it should trigger, and add only resources the skill
actually needs.
`;
	const openAiMetadata = `interface:
  display_name: ${quoteYaml(title)}
  short_description: ${quoteYaml(shortDescription)}
  default_prompt: ${quoteYaml(`Use $${name} for this task.`)}
`;

	return [
		packFile(`skills/${name}/SKILL.md`, encoder.encode(skill)),
		packFile(
			`skills/${name}/agents/openai.yaml`,
			encoder.encode(openAiMetadata),
		),
	];
}

function createSubagentFiles(
	name: string,
	description: string,
	workspaceWrite: boolean,
): PackFile[] {
	const profile = `schema_version = 1
name = ${quote(name)}
description = ${quote(description)}

[execution]
filesystem = ${quote(workspaceWrite ? "workspace-write" : "read-only")}
reasoning_effort = "inherit"
`;
	const instructions = `# ${titleFromName(name)}

Replace this scaffold with the subagent's focused role, boundaries, workflow,
and expected output. Keep the scope narrow enough that delegation is useful.
`;

	return [
		packFile(`subagents/${name}/agent.toml`, encoder.encode(profile)),
		packFile(`subagents/${name}/instructions.md`, encoder.encode(instructions)),
	];
}

function rewriteForkedFile(
	bytes: Uint8Array,
	relativePath: string,
	oldName: string,
	newName: string,
): Uint8Array {
	if (
		relativePath !== "SKILL.md" &&
		relativePath !== "agent.toml" &&
		relativePath !== "agents/openai.yaml"
	) {
		return bytes.slice();
	}

	let source = decoder.decode(bytes);

	if (relativePath === "SKILL.md") {
		source = source.replace(/^name:\s*.*$/m, `name: ${newName}`);
	} else if (relativePath === "agent.toml") {
		source = source.replace(/^name\s*=\s*.*$/m, `name = ${quote(newName)}`);
	} else {
		source = source.replaceAll(`$${oldName}`, `$${newName}`);
	}

	return encoder.encode(source);
}

function packFile(path: string, bytes: Uint8Array): PackFile {
	const copy = bytes.slice();
	return { path, bytes: copy, sha256: hashBytes(copy) };
}

function assertNameAvailable(
	existing: LoadedPack | undefined,
	name: string,
): void {
	if (
		existing?.manifest.components.some((component) => component.id === name)
	) {
		throw new AgentsPackError(
			"USAGE",
			`User component ${name} already exists. Edit its canonical source and run agents-pack sync.`,
			{ exitCode: 2 },
		);
	}
}

function requireDescription(value: string): string {
	const description = value.trim();

	if (description.length === 0) {
		throw new AgentsPackError(
			"USAGE",
			"A non-empty component description is required.",
			{ exitCode: 2 },
		);
	}

	if (description.includes("\n") || description.includes("\r")) {
		throw new AgentsPackError(
			"USAGE",
			"Component descriptions must be a single line.",
			{ exitCode: 2 },
		);
	}

	return description;
}

function kindDirectory(kind: UserComponentKind): "skills" | "subagents" {
	return kind === "skill" ? "skills" : "subagents";
}

function titleFromName(name: string): string {
	return name
		.split("-")
		.map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
		.join(" ");
}

function quote(value: string): string {
	return JSON.stringify(value);
}

function quoteYaml(value: string): string {
	return JSON.stringify(value);
}

function compareComponents(left: PackComponent, right: PackComponent): number {
	return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

async function isRegularFileOrMissing(path: string): Promise<boolean> {
	try {
		const info = await lstat(path);

		if (!info.isFile()) {
			throw new AgentsPackError(
				"MALFORMED_STATE",
				`User component manifest must be a regular file: ${path}`,
			);
		}

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
