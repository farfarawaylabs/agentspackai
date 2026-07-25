import { AgentsPackError } from "../core/errors.ts";
import type {
	AgentTarget,
	DesiredOutput,
	LoadedPack,
	PackComponent,
	RenderedPack,
	Scope,
} from "../core/types.ts";
import { renderClaudeInstruction } from "./claude.ts";
import { renderCodexInstruction } from "./codex.ts";
import { renderCursorInstruction } from "./cursor.ts";
import { renderSkill } from "./skills.ts";

const TARGET_ORDER: readonly AgentTarget[] = ["claude", "codex", "cursor"];
const COMPONENT_NAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function renderPack(
	pack: LoadedPack,
	scope: Scope,
	targets: readonly AgentTarget[],
): RenderedPack {
	const selectedTargets = validateTargets(scope, targets);
	const outputs: DesiredOutput[] = [];
	const warnings: string[] = [];

	for (const component of pack.manifest.components) {
		if (component.kind === "instruction") {
			outputs.push(
				...renderInstruction(pack, component, scope, selectedTargets),
			);
			continue;
		}

		const renderedSkill = renderSkill(component, pack.files, selectedTargets);
		outputs.push(...renderedSkill.outputs);
		warnings.push(...renderedSkill.warnings);
	}

	outputs.sort(compareOutputs);
	assertNoOutputCollisions(outputs);

	return { outputs, warnings };
}

function renderInstruction(
	pack: LoadedPack,
	component: PackComponent,
	scope: Scope,
	selectedTargets: ReadonlySet<AgentTarget>,
): DesiredOutput[] {
	const name = componentName(component.id);
	const source = pack.files.find((file) => file.path === component.source);

	if (source === undefined) {
		throw new AgentsPackError(
			"INVALID_PACK",
			`Instruction source is not loaded: ${component.source}`,
		);
	}

	const supportedTargets = TARGET_ORDER.filter(
		(target) =>
			selectedTargets.has(target) && component.targets.includes(target),
	);

	return supportedTargets.map((target) => {
		switch (target) {
			case "claude":
				return {
					...renderClaudeInstruction(name, source.bytes),
					componentId: component.id,
				};
			case "codex":
				return renderCodexInstruction(
					component.id,
					pack.manifest.version,
					source.bytes,
					scope,
				);
			case "cursor":
				return renderCursorInstruction(component.id, name, source.bytes);
		}

		throw new AgentsPackError(
			"UNSUPPORTED",
			`Unsupported instruction target: ${target}`,
		);
	});
}

function validateTargets(
	scope: Scope,
	targets: readonly AgentTarget[],
): ReadonlySet<AgentTarget> {
	if (targets.length === 0) {
		throw new AgentsPackError(
			"USAGE",
			"At least one agent target must be selected.",
		);
	}

	const selected = new Set(targets);

	if (selected.size !== targets.length) {
		throw new AgentsPackError(
			"USAGE",
			"Agent targets must not contain duplicates.",
		);
	}

	if (scope === "global" && selected.has("cursor")) {
		throw new AgentsPackError(
			"UNSUPPORTED",
			"Global Cursor instructions are not supported by the lifecycle MVP.",
		);
	}

	return selected;
}

function componentName(componentId: string): string {
	const name = componentId.split(".").at(-1);

	if (name === undefined || !COMPONENT_NAME.test(name)) {
		throw new AgentsPackError(
			"INVALID_PACK",
			`Component ID has no safe output name: ${componentId}`,
		);
	}

	return name;
}

function assertNoOutputCollisions(outputs: readonly DesiredOutput[]): void {
	const paths = new Set<string>();

	for (const output of outputs) {
		if (paths.has(output.path)) {
			throw new AgentsPackError(
				"INVALID_PACK",
				`Multiple components render to the same output path: ${output.path}`,
			);
		}

		paths.add(output.path);
	}
}

function compareOutputs(left: DesiredOutput, right: DesiredOutput): number {
	if (left.path < right.path) {
		return -1;
	}

	if (left.path > right.path) {
		return 1;
	}

	return 0;
}
