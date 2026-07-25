import { beforeAll, describe, expect, test } from "bun:test";
import { join, resolve } from "node:path";
import { renderPack } from "../../src/adapters/render.ts";
import { loadPack } from "../../src/core/pack.ts";
import type {
	AgentTarget,
	DesiredOutput,
	LoadedPack,
} from "../../src/core/types.ts";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const decoder = new TextDecoder();
let packVersionOne: LoadedPack;
let packVersionTwo: LoadedPack;

beforeAll(async () => {
	[packVersionOne, packVersionTwo] = await Promise.all([
		loadPack(join(PROJECT_ROOT, "fixtures/packs/0.1.0")),
		loadPack(join(PROJECT_ROOT, "fixtures/packs/0.2.0")),
	]);
});

describe("renderPack", () => {
	test("renders the complete repository tree for all targets", async () => {
		const rendered = renderPack(packVersionOne, "repository", [
			"claude",
			"codex",
			"cursor",
		]);

		expect(rendered.outputs.map((output) => output.path)).toEqual([
			".agents/skills/agents-pack-smoke-test/SKILL.md",
			".claude/rules/agents-pack/smoke.md",
			".claude/skills/agents-pack-smoke-test/SKILL.md",
			".cursor/rules/agents-pack/smoke.mdc",
			"AGENTS.md",
		]);
		expect(rendered.warnings).toEqual([
			"Cursor may discover agents-pack-smoke-test through both Claude and Codex compatibility roots.",
		]);

		await expectGolden(
			requireOutput(rendered.outputs, ".claude/rules/agents-pack/smoke.md"),
			"claude-smoke.md",
		);
		await expectGolden(
			requireOutput(rendered.outputs, "AGENTS.md"),
			"codex-smoke-block.md",
		);
		await expectGolden(
			requireOutput(rendered.outputs, ".cursor/rules/agents-pack/smoke.mdc"),
			"cursor-smoke.mdc",
		);
	});

	test("copies skill bytes exactly", () => {
		const rendered = renderPack(packVersionOne, "repository", ["claude"]);
		const output = requireOutput(
			rendered.outputs,
			".claude/skills/agents-pack-smoke-test/SKILL.md",
		);
		const source = packVersionOne.files.find(
			(file) => file.path === "skills/agents-pack-smoke-test/SKILL.md",
		);

		expect(source).toBeDefined();
		expect(output.bytes).toEqual(source?.bytes ?? new Uint8Array());
	});

	test("renders predictable changes for pack 0.2.0", () => {
		const versionOne = renderPack(packVersionOne, "repository", [
			"claude",
			"codex",
			"cursor",
		]);
		const versionTwo = renderPack(packVersionTwo, "repository", [
			"claude",
			"codex",
			"cursor",
		]);

		expect(versionTwo.outputs.map((output) => output.path)).toEqual(
			versionOne.outputs.map((output) => output.path),
		);

		for (let index = 0; index < versionOne.outputs.length; index += 1) {
			expect(versionTwo.outputs[index]?.bytes).not.toEqual(
				versionOne.outputs[index]?.bytes,
			);
		}
	});

	test("uses the global Codex instruction path", () => {
		const rendered = renderPack(packVersionOne, "global", ["claude", "codex"]);

		expect(rendered.outputs.map((output) => output.path)).toContain(
			".codex/AGENTS.md",
		);
		expect(rendered.outputs.map((output) => output.path)).not.toContain(
			"AGENTS.md",
		);
	});

	test("rejects global Cursor explicitly", () => {
		expect(() => renderPack(packVersionOne, "global", ["cursor"])).toThrow(
			"Global Cursor instructions are not supported",
		);
	});

	test("rejects duplicate selected targets", () => {
		expect(() =>
			renderPack(packVersionOne, "repository", ["claude", "claude"]),
		).toThrow("must not contain duplicates");
	});

	test("rejects output-path collisions", () => {
		const collisionPack: LoadedPack = {
			...packVersionOne,
			manifest: {
				...packVersionOne.manifest,
				components: [
					...packVersionOne.manifest.components,
					{
						id: "custom.smoke",
						kind: "instruction",
						source: "instructions/smoke.md",
						targets: ["claude"],
					},
				],
			},
		};

		expect(() => renderPack(collisionPack, "repository", ["claude"])).toThrow(
			"render to the same output path",
		);
	});
});

describe("Cursor skill placement", () => {
	test("Cursor only uses the native Cursor skill root", () => {
		expect(skillPaths(["cursor"])).toEqual([
			".cursor/skills/agents-pack-smoke-test/SKILL.md",
		]);
	});

	test("Cursor and Claude reuse the Claude compatibility root", () => {
		expect(skillPaths(["cursor", "claude"])).toEqual([
			".claude/skills/agents-pack-smoke-test/SKILL.md",
		]);
	});

	test("Cursor and Codex reuse the Codex compatibility root", () => {
		expect(skillPaths(["cursor", "codex"])).toEqual([
			".agents/skills/agents-pack-smoke-test/SKILL.md",
		]);
	});

	test("all targets create two required native copies and one warning", () => {
		const rendered = renderPack(packVersionOne, "repository", [
			"cursor",
			"claude",
			"codex",
		]);

		expect(skillOutputPaths(rendered.outputs)).toEqual([
			".agents/skills/agents-pack-smoke-test/SKILL.md",
			".claude/skills/agents-pack-smoke-test/SKILL.md",
		]);
		expect(rendered.warnings).toHaveLength(1);
	});
});

function skillPaths(targets: AgentTarget[]): string[] {
	return skillOutputPaths(
		renderPack(packVersionOne, "repository", targets).outputs,
	);
}

function skillOutputPaths(outputs: readonly DesiredOutput[]): string[] {
	return outputs
		.filter((output) => output.path.includes("/skills/"))
		.map((output) => output.path);
}

function requireOutput(
	outputs: readonly DesiredOutput[],
	path: string,
): DesiredOutput {
	const output = outputs.find((candidate) => candidate.path === path);

	if (output === undefined) {
		throw new Error(`Missing rendered output: ${path}`);
	}

	return output;
}

async function expectGolden(
	output: DesiredOutput,
	goldenName: string,
): Promise<void> {
	const expected = await Bun.file(
		join(PROJECT_ROOT, "tests/fixtures/golden", goldenName),
	).text();

	expect(decoder.decode(output.bytes)).toBe(expected);
}
