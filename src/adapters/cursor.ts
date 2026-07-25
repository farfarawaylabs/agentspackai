import type { DesiredOutput } from "../core/types.ts";

const encoder = new TextEncoder();
const CURSOR_HEADER = encoder.encode("---\nalwaysApply: true\n---\n\n");

export function renderCursorInstruction(
	componentId: string,
	name: string,
	body: Uint8Array,
): DesiredOutput {
	const bytes = new Uint8Array(CURSOR_HEADER.byteLength + body.byteLength);
	bytes.set(CURSOR_HEADER);
	bytes.set(body, CURSOR_HEADER.byteLength);

	return {
		kind: "file",
		componentId,
		adapter: "cursor",
		path: `.cursor/rules/agents-pack/${name}.mdc`,
		bytes,
	};
}
