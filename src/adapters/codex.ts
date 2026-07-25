import type { DesiredOutput, Scope } from "../core/types.ts";
import { renderManagedBlock } from "../filesystem/managed-block.ts";

export function renderCodexInstruction(
	componentId: string,
	version: string,
	body: Uint8Array,
	scope: Scope,
): DesiredOutput {
	return {
		kind: "managed-block",
		componentId,
		adapter: "codex",
		path: scope === "global" ? ".codex/AGENTS.md" : "AGENTS.md",
		blockId: componentId,
		bytes: renderManagedBlock(componentId, version, body),
	};
}
