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
const encoder = new TextEncoder();
let packVersionOne: LoadedPack;
let packVersionTwo: LoadedPack;
let corePack: LoadedPack;

beforeAll(async () => {
	[packVersionOne, packVersionTwo, corePack] = await Promise.all([
		loadPack(join(PROJECT_ROOT, "fixtures/packs/0.1.0")),
		loadPack(join(PROJECT_ROOT, "fixtures/packs/0.2.0")),
		loadPack(join(PROJECT_ROOT, "content/packs/core")),
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
			".claude/rules/agents-pack/ap-smoke-instructions.md",
			".claude/skills/agents-pack-smoke-test/SKILL.md",
			".cursor/rules/agents-pack/ap-smoke-instructions.mdc",
			"AGENTS.md",
		]);
		expect(rendered.warnings).toEqual([
			"Cursor may discover agents-pack-smoke-test through both Claude and Codex compatibility roots.",
		]);

		await expectGolden(
			requireOutput(
				rendered.outputs,
				".claude/rules/agents-pack/ap-smoke-instructions.md",
			),
			"claude-smoke.md",
		);
		await expectGolden(
			requireOutput(rendered.outputs, "AGENTS.md"),
			"codex-smoke-block.md",
		);
		await expectGolden(
			requireOutput(
				rendered.outputs,
				".cursor/rules/agents-pack/ap-smoke-instructions.mdc",
			),
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

	test("renders the first-party core skills with their references", () => {
		const rendered = renderPack(corePack, "repository", ["claude"]);

		expect(corePack.manifest.version).toBe("0.25.0");
		expect(rendered.outputs.map((output) => output.path)).toEqual([
			".claude/agents/ap-backend-python-developer.md",
			".claude/agents/ap-backend-typescript-developer.md",
			".claude/agents/ap-code-reviewer.md",
			".claude/agents/ap-trend-researcher.md",
			".claude/agents/ap-ux-enhancer.md",
			".claude/agents/ap-ux-researcher.md",
			".claude/rules/agents-pack/ap-core-instructions.md",
			".claude/skills/ap-audit-geo/SKILL.md",
			".claude/skills/ap-audit-geo/references/geo-audit-checklist.md",
			".claude/skills/ap-audit-seo/SKILL.md",
			".claude/skills/ap-audit-seo/references/seo-audit-checklist.md",
			".claude/skills/ap-clear-dev-context/SKILL.md",
			".claude/skills/ap-compress-todos/SKILL.md",
			".claude/skills/ap-continue-dev-session/SKILL.md",
			".claude/skills/ap-create-new-skill/SKILL.md",
			".claude/skills/ap-create-new-skill/agents/openai.yaml",
			".claude/skills/ap-create-prd/SKILL.md",
			".claude/skills/ap-create-prd/references/prd-structure.md",
			".claude/skills/ap-debug/SKILL.md",
			".claude/skills/ap-design-data-models/SKILL.md",
			".claude/skills/ap-design-data-models/references/document-and-distributed-modeling.md",
			".claude/skills/ap-design-data-models/references/relational-modeling.md",
			".claude/skills/ap-design-data-models/references/schema-evolution-and-governance.md",
			".claude/skills/ap-develop-apis/SKILL.md",
			".claude/skills/ap-develop-apis/references/api-consumer-artifacts.md",
			".claude/skills/ap-develop-apis/references/http-contract-checklist.md",
			".claude/skills/ap-develop-apis/references/security-reliability-and-testing.md",
			".claude/skills/ap-develop-apis/references/thin-api-architecture.md",
			".claude/skills/ap-develop-with-vercel-ai-sdk/SKILL.md",
			".claude/skills/ap-develop-with-vercel-ai-sdk/references/core-architecture-and-generation.md",
			".claude/skills/ap-develop-with-vercel-ai-sdk/references/migrate-observe-and-test.md",
			".claude/skills/ap-develop-with-vercel-ai-sdk/references/tools-context-and-safety.md",
			".claude/skills/ap-develop-with-vercel-ai-sdk/references/ui-streaming-and-persistence.md",
			".claude/skills/ap-frontend-design/SKILL.md",
			".claude/skills/ap-frontend-design/references/design-md.md",
			".claude/skills/ap-frontend-review/SKILL.md",
			".claude/skills/ap-frontend-review/references/review-checklist.md",
			".claude/skills/ap-handle-errors-reliably/SKILL.md",
			".claude/skills/ap-handle-errors-reliably/references/retries-timeouts-and-cleanup.md",
			".claude/skills/ap-landing-page/SKILL.md",
			".claude/skills/ap-landing-page/references/pre-publish-checklist.md",
			".claude/skills/ap-landing-page/references/search-and-citation.md",
			".claude/skills/ap-manage-agents-pack/SKILL.md",
			".claude/skills/ap-manage-agents-pack/agents/openai.yaml",
			".claude/skills/ap-refresh-repo-docs/SKILL.md",
			".claude/skills/ap-review-plan/SKILL.md",
			".claude/skills/ap-run-market-research/SKILL.md",
			".claude/skills/ap-run-market-research/references/report-structure.md",
			".claude/skills/ap-security-audit/SKILL.md",
			".claude/skills/ap-security-audit/references/audit-surfaces.md",
			".claude/skills/ap-security-audit/references/finding-validation-and-reporting.md",
			".claude/skills/ap-start-dev-session/SKILL.md",
			".claude/skills/ap-test-web-app/SKILL.md",
			".claude/skills/ap-validate-trust-boundaries/SKILL.md",
			".claude/skills/ap-validate-trust-boundaries/references/files-text-and-structured-input.md",
			".claude/skills/ap-write-database-queries/SKILL.md",
			".claude/skills/ap-write-database-queries/references/performance-indexing-and-operations.md",
			".claude/skills/ap-write-database-queries/references/query-correctness-and-security.md",
			".claude/skills/ap-write-database-queries/references/transactions-concurrency-and-testing.md",
		]);
		expect(
			decodeOutput(
				rendered.outputs,
				".claude/rules/agents-pack/ap-core-instructions.md",
			),
		).toContain("## Clear explanations");
		expect(
			decodeOutput(
				rendered.outputs,
				".claude/rules/agents-pack/ap-core-instructions.md",
			),
		).toContain("concise concrete example or familiar analogy");
	});

	test("always renders the Agents Pack management skills", () => {
		const rendered = renderPack(
			corePack,
			"repository",
			["claude"],
			["ap-core-instructions"],
		);
		const paths = rendered.outputs.map((output) => output.path);

		expect(paths).toContain(".claude/skills/ap-manage-agents-pack/SKILL.md");
		expect(paths).toContain(".claude/skills/ap-create-new-skill/SKILL.md");
		expect(
			corePack.manifest.components
				.filter((component) =>
					["ap-manage-agents-pack", "ap-create-new-skill"].includes(
						component.id,
					),
				)
				.every((component) => component.selection === "required"),
		).toBe(true);
	});

	test("renders action workflows as portable skills, not legacy commands", () => {
		const rendered = renderPack(corePack, "repository", [
			"claude",
			"codex",
			"cursor",
		]);

		for (const [name, sourceRoot] of [
			["ap-audit-geo", "skills/marketing/search/ap-audit-geo"],
			["ap-audit-seo", "skills/marketing/search/ap-audit-seo"],
			[
				"ap-clear-dev-context",
				"skills/engineering/workflows/session/ap-clear-dev-context",
			],
			[
				"ap-compress-todos",
				"skills/engineering/documentation/ap-compress-todos",
			],
			[
				"ap-continue-dev-session",
				"skills/engineering/workflows/session/ap-continue-dev-session",
			],
			["ap-create-prd", "skills/product/planning/ap-create-prd"],
			["ap-debug", "skills/engineering/workflows/debugging/ap-debug"],
			[
				"ap-refresh-repo-docs",
				"skills/engineering/documentation/ap-refresh-repo-docs",
			],
			[
				"ap-review-plan",
				"skills/engineering/workflows/planning/ap-review-plan",
			],
			[
				"ap-run-market-research",
				"skills/product/research/ap-run-market-research",
			],
			["ap-security-audit", "skills/engineering/security/ap-security-audit"],
			[
				"ap-start-dev-session",
				"skills/engineering/workflows/session/ap-start-dev-session",
			],
			["ap-test-web-app", "skills/engineering/testing/ap-test-web-app"],
		]) {
			const source = corePack.files.find(
				(file) => file.path === `${sourceRoot}/SKILL.md`,
			);

			expect(source).toBeDefined();
			expect(
				requireOutput(rendered.outputs, `.claude/skills/${name}/SKILL.md`)
					.bytes,
			).toEqual(source?.bytes ?? new Uint8Array());
			expect(
				requireOutput(rendered.outputs, `.agents/skills/${name}/SKILL.md`)
					.bytes,
			).toEqual(source?.bytes ?? new Uint8Array());
			expect(rendered.warnings).toContain(
				`Cursor may discover ${name} through both Claude and Codex compatibility roots.`,
			);
			expect(decoder.decode(source?.bytes)).not.toContain("$ARGUMENTS");
		}

		expect(
			decodeOutput(
				rendered.outputs,
				".claude/skills/ap-clear-dev-context/SKILL.md",
			),
		).toContain("does not clear the conversation");
		expect(
			decodeOutput(
				rendered.outputs,
				".claude/skills/ap-continue-dev-session/SKILL.md",
			),
		).toContain("Inspect relevant memory");
		expect(
			decodeOutput(rendered.outputs, ".claude/skills/ap-review-plan/SKILL.md"),
		).toContain("Start one independent review subagent");
		expect(
			decodeOutput(rendered.outputs, ".claude/skills/ap-create-prd/SKILL.md"),
		).toContain("Ask one decision-sized question at a time by default");
		expect(
			decodeOutput(rendered.outputs, ".claude/skills/ap-audit-geo/SKILL.md"),
		).toContain("currently ignores `llms.txt` for Search");
		expect(
			decodeOutput(rendered.outputs, ".claude/skills/ap-audit-seo/SKILL.md"),
		).toContain("Static fetching cannot prove");
		expect(
			decodeOutput(
				rendered.outputs,
				".claude/skills/ap-frontend-design/SKILL.md",
			),
		).toContain("Use `ap-audit-seo`");
		expect(
			decodeOutput(
				rendered.outputs,
				".claude/skills/ap-start-dev-session/SKILL.md",
			),
		).toContain(".agentspack/TECHNICAL_REQUIREMENTS.md");

		expect(
			rendered.outputs.some((output) =>
				output.path.startsWith(".claude/commands/"),
			),
		).toBe(false);
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
						id: "ap-smoke-duplicate",
						kind: "skill",
						title: "Duplicate smoke skill",
						summary: "Create a deliberate output collision.",
						category: "testing",
						selection: "optional",
						source: "skills/agents-pack-smoke-test",
						targets: ["claude"],
					},
				],
			},
		};

		expect(() =>
			renderPack(
				collisionPack,
				"repository",
				["claude"],
				[
					"ap-smoke-instructions",
					"agents-pack-smoke-test",
					"ap-smoke-duplicate",
				],
			),
		).toThrow("render to the same output path");
	});
});

describe("Subagent rendering", () => {
	test("renders native read-only definitions for all targets", () => {
		const rendered = renderPack(corePack, "repository", [
			"claude",
			"codex",
			"cursor",
		]);

		for (const name of [
			"ap-code-reviewer",
			"ap-trend-researcher",
			"ap-ux-researcher",
		]) {
			const claude = decodeOutput(
				rendered.outputs,
				`.claude/agents/${name}.md`,
			);
			const codexConfig = Bun.TOML.parse(
				decodeOutput(rendered.outputs, `.codex/agents/${name}.toml`),
			);
			const cursor = decodeOutput(
				rendered.outputs,
				`.cursor/agents/${name}.md`,
			);

			expect(claude).toContain("permissionMode: plan");
			expect(claude).toContain("effort: high");
			expect(cursor).toContain("readonly: true");
			expect(codexConfig).toMatchObject({
				name,
				model_reasoning_effort: "high",
				sandbox_mode: "read-only",
			});
		}

		const codeReviewerConfig = Bun.TOML.parse(
			decodeOutput(rendered.outputs, ".codex/agents/ap-code-reviewer.toml"),
		);
		expect(
			(codeReviewerConfig as Record<string, unknown>).developer_instructions,
		).toContain("Review code like an owner.");

		const trendResearcherConfig = Bun.TOML.parse(
			decodeOutput(rendered.outputs, ".codex/agents/ap-trend-researcher.toml"),
		);
		expect(
			(trendResearcherConfig as Record<string, unknown>).developer_instructions,
		).toContain("Use current web research.");

		const uxResearcherConfig = Bun.TOML.parse(
			decodeOutput(rendered.outputs, ".codex/agents/ap-ux-researcher.toml"),
		);
		expect(
			(uxResearcherConfig as Record<string, unknown>).developer_instructions,
		).toContain("Never claim to have interviewed");
	});

	test("does not pin a provider model", () => {
		const rendered = renderPack(corePack, "repository", [
			"claude",
			"codex",
			"cursor",
		]);

		for (const path of [
			".claude/agents/ap-backend-python-developer.md",
			".claude/agents/ap-backend-typescript-developer.md",
			".claude/agents/ap-code-reviewer.md",
			".claude/agents/ap-trend-researcher.md",
			".claude/agents/ap-ux-enhancer.md",
			".claude/agents/ap-ux-researcher.md",
			".codex/agents/ap-backend-python-developer.toml",
			".codex/agents/ap-backend-typescript-developer.toml",
			".codex/agents/ap-code-reviewer.toml",
			".codex/agents/ap-trend-researcher.toml",
			".codex/agents/ap-ux-enhancer.toml",
			".codex/agents/ap-ux-researcher.toml",
			".cursor/agents/ap-backend-python-developer.md",
			".cursor/agents/ap-backend-typescript-developer.md",
			".cursor/agents/ap-code-reviewer.md",
			".cursor/agents/ap-trend-researcher.md",
			".cursor/agents/ap-ux-enhancer.md",
			".cursor/agents/ap-ux-researcher.md",
		]) {
			const content = decodeOutput(rendered.outputs, path);
			expect(content).not.toMatch(/^model[: =]/m);
		}
	});

	test("renders native workspace-write definitions for implementation agents", () => {
		const rendered = renderPack(corePack, "repository", [
			"claude",
			"codex",
			"cursor",
		]);

		for (const name of [
			"ap-backend-python-developer",
			"ap-backend-typescript-developer",
			"ap-ux-enhancer",
		]) {
			const claude = decodeOutput(
				rendered.outputs,
				`.claude/agents/${name}.md`,
			);
			const codex = Bun.TOML.parse(
				decodeOutput(rendered.outputs, `.codex/agents/${name}.toml`),
			);
			const cursor = decodeOutput(
				rendered.outputs,
				`.cursor/agents/${name}.md`,
			);

			expect(claude).toContain("permissionMode: default");
			expect(claude).toContain("effort: high");
			expect(codex).toMatchObject({
				name,
				model_reasoning_effort: "high",
				sandbox_mode: "workspace-write",
			});
			expect(cursor).toContain("readonly: false");
		}
	});

	test("escapes TOML-sensitive instruction content", () => {
		const sensitiveInstructions = 'Keep """quotes""" and C:\\source intact.';
		const pack: LoadedPack = {
			...corePack,
			files: corePack.files.map((file) =>
				file.path === "subagents/engineering/ap-code-reviewer/instructions.md"
					? { ...file, bytes: encoder.encode(sensitiveInstructions) }
					: file,
			),
		};
		const rendered = renderPack(pack, "repository", ["codex"]);
		const config = Bun.TOML.parse(
			decodeOutput(rendered.outputs, ".codex/agents/ap-code-reviewer.toml"),
		) as Record<string, unknown>;

		expect(config.developer_instructions).toBe(`${sensitiveInstructions}\n`);
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

function decodeOutput(outputs: readonly DesiredOutput[], path: string): string {
	return decoder.decode(requireOutput(outputs, path).bytes);
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
