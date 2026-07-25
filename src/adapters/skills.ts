import { AgentsPackError } from "../core/errors.ts";
import type {
	AgentTarget,
	DesiredOutput,
	PackComponent,
	PackFile,
} from "../core/types.ts";

const SKILL_NAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export interface RenderedSkill {
	outputs: DesiredOutput[];
	warnings: string[];
}

export function renderSkill(
	component: PackComponent,
	packFiles: readonly PackFile[],
	selectedTargets: ReadonlySet<AgentTarget>,
): RenderedSkill {
	const skillName = component.source.split("/").at(-1);

	if (skillName === undefined || !SKILL_NAME.test(skillName)) {
		throw new AgentsPackError(
			"INVALID_PACK",
			`Skill component ${component.id} has an invalid directory name: ${component.source}`,
		);
	}

	const sourcePrefix = `${component.source}/`;
	const skillFiles = packFiles.filter((file) =>
		file.path.startsWith(sourcePrefix),
	);

	if (skillFiles.length === 0) {
		throw new AgentsPackError(
			"INVALID_PACK",
			`Skill component ${component.id} contains no files.`,
		);
	}

	const supportedTargets = new Set(
		component.targets.filter((target) => selectedTargets.has(target)),
	);
	const outputs: DesiredOutput[] = [];
	const warnings: string[] = [];
	const hasClaudeCopy = supportedTargets.has("claude");
	const hasCodexCopy = supportedTargets.has("codex");

	if (hasClaudeCopy) {
		outputs.push(
			...copySkillFiles(
				component.id,
				"claude",
				`.claude/skills/${skillName}`,
				sourcePrefix,
				skillFiles,
			),
		);
	}

	if (hasCodexCopy) {
		outputs.push(
			...copySkillFiles(
				component.id,
				"codex",
				`.agents/skills/${skillName}`,
				sourcePrefix,
				skillFiles,
			),
		);
	}

	if (supportedTargets.has("cursor")) {
		if (!hasClaudeCopy && !hasCodexCopy) {
			outputs.push(
				...copySkillFiles(
					component.id,
					"cursor",
					`.cursor/skills/${skillName}`,
					sourcePrefix,
					skillFiles,
				),
			);
		} else if (hasClaudeCopy && hasCodexCopy) {
			warnings.push(
				`Cursor may discover ${skillName} through both Claude and Codex compatibility roots.`,
			);
		}
	}

	return { outputs, warnings };
}

function copySkillFiles(
	componentId: string,
	adapter: AgentTarget,
	destinationRoot: string,
	sourcePrefix: string,
	files: readonly PackFile[],
): DesiredOutput[] {
	return files.map((file) => ({
		kind: "file",
		componentId,
		adapter,
		path: `${destinationRoot}/${file.path.slice(sourcePrefix.length)}`,
		bytes: file.bytes.slice(),
	}));
}
