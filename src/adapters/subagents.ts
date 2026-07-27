import { AgentsPackError } from "../core/errors.ts";
import type {
	AgentTarget,
	DesiredOutput,
	PackComponent,
	PackFile,
} from "../core/types.ts";

const SUBAGENT_NAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const REASONING_EFFORTS = new Set(["inherit", "low", "medium", "high"]);
const decoder = new TextDecoder();
const encoder = new TextEncoder();

interface SubagentProfile {
	name: string;
	description: string;
	filesystem: "read-only" | "workspace-write";
	reasoningEffort: "inherit" | "low" | "medium" | "high";
}

type UnknownRecord = Record<string, unknown>;

export function renderSubagent(
	component: PackComponent,
	packFiles: readonly PackFile[],
	selectedTargets: ReadonlySet<AgentTarget>,
): DesiredOutput[] {
	const profile = loadProfile(component, packFiles);
	const instructions = loadInstructions(component, packFiles);
	const supportedTargets = component.targets.filter((target) =>
		selectedTargets.has(target),
	);

	return supportedTargets.map((target) => {
		switch (target) {
			case "claude":
				return fileOutput(
					component.id,
					target,
					`.claude/agents/${profile.name}.md`,
					renderClaude(profile, instructions),
				);
			case "codex":
				return fileOutput(
					component.id,
					target,
					`.codex/agents/${profile.name}.toml`,
					renderCodex(profile, instructions),
				);
			case "cursor":
				return fileOutput(
					component.id,
					target,
					`.cursor/agents/${profile.name}.md`,
					renderCursor(profile, instructions),
				);
		}

		throw new AgentsPackError(
			"UNSUPPORTED",
			`Unsupported subagent target: ${target}`,
		);
	});
}

function loadProfile(
	component: PackComponent,
	packFiles: readonly PackFile[],
): SubagentProfile {
	const profilePath = `${component.source}/agent.toml`;
	const source = requirePackFile(component, packFiles, profilePath);
	let parsed: unknown;

	try {
		parsed = Bun.TOML.parse(decoder.decode(source.bytes));
	} catch (cause) {
		throw invalidSubagent(component, `Unable to parse ${profilePath}.`, cause);
	}

	if (!isRecord(parsed)) {
		throw invalidSubagent(component, `${profilePath} must be a TOML table.`);
	}

	if (parsed.schema_version !== 1) {
		throw invalidSubagent(
			component,
			`${profilePath} schema_version must be 1.`,
		);
	}

	const name = requireString(component, parsed.name, "name");
	const description = requireString(
		component,
		parsed.description,
		"description",
	);

	if (!SUBAGENT_NAME.test(name)) {
		throw invalidSubagent(
			component,
			"agent.toml name must use lowercase letters, numbers, and hyphens.",
		);
	}

	const directoryName = component.source.split("/").at(-1);

	if (directoryName !== name) {
		throw invalidSubagent(
			component,
			"the source directory and agent.toml name must match.",
		);
	}

	if (!isRecord(parsed.execution)) {
		throw invalidSubagent(component, "agent.toml must contain [execution].");
	}

	const filesystem = parsed.execution.filesystem;

	if (filesystem !== "read-only" && filesystem !== "workspace-write") {
		throw invalidSubagent(
			component,
			"execution.filesystem must be read-only or workspace-write.",
		);
	}

	const reasoningEffort = requireString(
		component,
		parsed.execution.reasoning_effort,
		"execution.reasoning_effort",
	);

	if (!REASONING_EFFORTS.has(reasoningEffort)) {
		throw invalidSubagent(
			component,
			"execution.reasoning_effort must be inherit, low, medium, or high.",
		);
	}

	return {
		name,
		description,
		filesystem,
		reasoningEffort: reasoningEffort as SubagentProfile["reasoningEffort"],
	};
}

function loadInstructions(
	component: PackComponent,
	packFiles: readonly PackFile[],
): string {
	const instructionsPath = `${component.source}/instructions.md`;
	const source = requirePackFile(component, packFiles, instructionsPath);
	const instructions = decoder.decode(source.bytes).trim();

	if (instructions.length === 0) {
		throw invalidSubagent(component, `${instructionsPath} must not be empty.`);
	}

	return instructions;
}

function renderClaude(profile: SubagentProfile, instructions: string): string {
	const effort =
		profile.reasoningEffort === "inherit"
			? ""
			: `effort: ${profile.reasoningEffort}\n`;
	const permissionMode =
		profile.filesystem === "read-only" ? "plan" : "default";

	return `---
name: ${profile.name}
description: ${JSON.stringify(profile.description)}
permissionMode: ${permissionMode}
${effort}---

${instructions}
`;
}

function renderCursor(profile: SubagentProfile, instructions: string): string {
	return `---
name: ${profile.name}
description: ${JSON.stringify(profile.description)}
readonly: ${profile.filesystem === "read-only"}
---

${instructions}
`;
}

function renderCodex(profile: SubagentProfile, instructions: string): string {
	const effort =
		profile.reasoningEffort === "inherit"
			? ""
			: `model_reasoning_effort = ${JSON.stringify(profile.reasoningEffort)}\n`;

	return `name = ${JSON.stringify(profile.name)}
description = ${JSON.stringify(profile.description)}
${effort}sandbox_mode = ${JSON.stringify(profile.filesystem)}
developer_instructions = """\\
${escapeTomlMultiline(instructions)}
"""
`;
}

function escapeTomlMultiline(value: string): string {
	return value.replaceAll("\\", "\\\\").replaceAll('"""', '\\"""');
}

function requirePackFile(
	component: PackComponent,
	packFiles: readonly PackFile[],
	path: string,
): PackFile {
	const file = packFiles.find((candidate) => candidate.path === path);

	if (file === undefined) {
		throw invalidSubagent(component, `Source file is not loaded: ${path}.`);
	}

	return file;
}

function requireString(
	component: PackComponent,
	value: unknown,
	field: string,
): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw invalidSubagent(
			component,
			`agent.toml ${field} must be a non-empty string.`,
		);
	}

	return value.trim();
}

function fileOutput(
	componentId: string,
	adapter: AgentTarget,
	path: string,
	content: string,
): DesiredOutput {
	return {
		kind: "file",
		componentId,
		adapter,
		path,
		bytes: encoder.encode(content),
	};
}

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidSubagent(
	component: PackComponent,
	message: string,
	cause?: unknown,
): AgentsPackError {
	return new AgentsPackError(
		"INVALID_PACK",
		`Invalid subagent component ${component.id}: ${message}`,
		{ cause },
	);
}
