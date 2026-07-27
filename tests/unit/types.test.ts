import { describe, expect, test } from "bun:test";
import type {
	ChangePlan,
	DesiredOutput,
	PackManifest,
} from "../../src/core/types.ts";

describe("Phase 0 contracts", () => {
	test("represent a pack, desired output, and change plan", () => {
		const manifest: PackManifest = {
			schemaVersion: 1,
			id: "agents-pack-smoke",
			version: "0.1.0",
			title: "Agents Pack Smoke Test",
			components: [],
		};

		const output: DesiredOutput = {
			kind: "file",
			componentId: "instruction.smoke",
			adapter: "claude",
			path: ".claude/rules/agents-pack/smoke.md",
			bytes: new TextEncoder().encode("smoke"),
		};

		const plan: ChangePlan = {
			command: "init",
			scope: "repository",
			operations: [
				{
					kind: "create-file",
					path: output.path,
					bytes: output.bytes,
				},
			],
			warnings: [],
		};

		expect(manifest.schemaVersion).toBe(1);
		expect(output.kind).toBe("file");
		expect(plan.operations).toHaveLength(1);
	});
});
