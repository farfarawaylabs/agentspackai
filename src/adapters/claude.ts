import type { DesiredOutput } from "../core/types.ts";

export function renderClaudeInstruction(
	name: string,
	body: Uint8Array,
): DesiredOutput {
	return {
		kind: "file",
		componentId: `instruction.${name}`,
		adapter: "claude",
		path: `.claude/rules/agents-pack/${name}.md`,
		bytes: body.slice(),
	};
}
