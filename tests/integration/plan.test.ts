import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import {
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	rmdir,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { formatChangePlan } from "../../src/core/format-plan.ts";
import { loadPack } from "../../src/core/pack.ts";
import { planEject, planInit, planUpdate } from "../../src/core/plan.ts";
import type {
	ChangePlan,
	LoadedPack,
	PathContext,
} from "../../src/core/types.ts";
import {
	insertManagedBlock,
	removeManagedBlock,
	replaceManagedBlock,
} from "../../src/filesystem/managed-block.ts";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const temporaryDirectories: string[] = [];
let packVersionOne: LoadedPack;
let packVersionTwo: LoadedPack;

beforeAll(async () => {
	[packVersionOne, packVersionTwo] = await Promise.all([
		loadPack(join(PROJECT_ROOT, "fixtures/packs/0.1.0")),
		loadPack(join(PROJECT_ROOT, "fixtures/packs/0.2.0")),
	]);
});

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("init planning", () => {
	test("creates a deterministic read-only plan", async () => {
		const environment = await createEnvironment();
		const before = await snapshotTree(environment.repository);
		const options = {
			pack: packVersionOne,
			scope: "repository" as const,
			targets: ["cursor", "codex", "claude"] as const,
			context: environment.context,
		};
		const first = await planInit(options);
		const second = await planInit(options);

		expect(first).toEqual(second);
		expect(await snapshotTree(environment.repository)).toEqual(before);
		await expectGoldenPlan(first, "init-plan.txt");
	});

	test("treats repeated identical initialization as a no-op", async () => {
		const environment = await createEnvironment();
		const first = await planInit({
			pack: packVersionOne,
			scope: "repository",
			targets: ["claude", "codex", "cursor"],
			context: environment.context,
		});
		await materializePlan(environment.repository, first);

		const repeated = await planInit({
			pack: packVersionOne,
			scope: "repository",
			targets: ["cursor", "claude", "codex"],
			context: environment.context,
		});

		expect(repeated.operations).toEqual([]);
		expect(formatChangePlan(repeated)).toContain("No changes.");
	});

	test("accepts an existing user-owned AGENTS.md but rejects exact file conflicts", async () => {
		const environment = await createEnvironment();
		await writePortable(
			environment.repository,
			"AGENTS.md",
			encoder.encode("# User instructions\n"),
		);

		const plan = await planInit({
			pack: packVersionOne,
			scope: "repository",
			targets: ["codex"],
			context: environment.context,
		});
		expect(
			plan.operations.find((operation) => operation.path === "AGENTS.md"),
		).toMatchObject({
			kind: "insert-block",
			path: "AGENTS.md",
		});

		const conflictEnvironment = await createEnvironment();
		await writePortable(
			conflictEnvironment.repository,
			".claude/rules/agents-pack/ap-smoke-instructions.md",
			encoder.encode("unowned\n"),
		);
		expect(
			planInit({
				pack: packVersionOne,
				scope: "repository",
				targets: ["claude"],
				context: conflictEnvironment.context,
			}),
		).rejects.toMatchObject({ code: "OWNERSHIP_CONFLICT" });
	});

	test("rejects malformed shared markers and unsupported global Cursor", async () => {
		const environment = await createEnvironment();
		await writePortable(
			environment.repository,
			"AGENTS.md",
			encoder.encode(
				"<!-- agents-pack:start id=ap-smoke-instructions version=0.1.0 -->\n",
			),
		);

		expect(
			planInit({
				pack: packVersionOne,
				scope: "repository",
				targets: ["codex"],
				context: environment.context,
			}),
		).rejects.toMatchObject({ code: "OWNERSHIP_CONFLICT" });

		expect(
			planInit({
				pack: packVersionOne,
				scope: "global",
				targets: ["cursor"],
				context: environment.context,
			}),
		).rejects.toMatchObject({ code: "UNSUPPORTED" });
	});

	test("rejects conflicting global and repository scope choices", async () => {
		const environment = await createEnvironment();
		const repositoryPlan = await planInit({
			pack: packVersionOne,
			scope: "repository",
			targets: ["claude"],
			context: environment.context,
		});
		await materializePlan(environment.repository, repositoryPlan);

		expect(
			planInit({
				pack: packVersionOne,
				scope: "global",
				targets: ["claude"],
				context: environment.context,
			}),
		).rejects.toMatchObject({ code: "SCOPE_CONFLICT" });
	});
});

describe("update planning", () => {
	test("plans a clean version update and preserves user text outside AGENTS.md", async () => {
		const environment = await createEnvironment();
		await initialize(environment, ["claude", "codex", "cursor"]);
		const agentsPath = join(environment.repository, "AGENTS.md");
		const installedAgents = await readFile(agentsPath);
		const userSuffix = encoder.encode("\n# User-only addition\n");
		await writeFile(agentsPath, concatenate([installedAgents, userSuffix]));

		const plan = await planUpdate({
			pack: packVersionTwo,
			context: environment.context,
		});

		await expectGoldenPlan(plan, "update-plan.txt");
		await materializePlan(environment.repository, plan);
		const updated = await readFile(agentsPath);
		expect(decoder.decode(updated)).toEndWith("# User-only addition\n");
		expect(decoder.decode(updated)).toContain("version=0.2.0");
	});

	test("returns a no-op for the already installed immutable pack", async () => {
		const environment = await createEnvironment();
		await initialize(environment, ["claude", "codex"]);

		const plan = await planUpdate({
			pack: packVersionOne,
			context: environment.context,
		});

		expect(plan.operations).toEqual([]);
	});

	test("refuses missing or modified managed files", async () => {
		const missingEnvironment = await createEnvironment();
		await initialize(missingEnvironment, ["claude"]);
		await rm(
			join(
				missingEnvironment.repository,
				".claude/rules/agents-pack/ap-smoke-instructions.md",
			),
		);

		expect(
			planUpdate({
				pack: packVersionTwo,
				context: missingEnvironment.context,
			}),
		).rejects.toMatchObject({ code: "DRIFT" });

		const modifiedEnvironment = await createEnvironment();
		await initialize(modifiedEnvironment, ["claude"]);
		await writePortable(
			modifiedEnvironment.repository,
			".claude/rules/agents-pack/ap-smoke-instructions.md",
			encoder.encode("edited\n"),
		);

		expect(
			planUpdate({
				pack: packVersionTwo,
				context: modifiedEnvironment.context,
			}),
		).rejects.toMatchObject({ code: "DRIFT" });
	});

	test("refuses edits inside the managed AGENTS.md block", async () => {
		const environment = await createEnvironment();
		await initialize(environment, ["codex"]);
		const agentsPath = join(environment.repository, "AGENTS.md");
		const source = await readFile(agentsPath, "utf8");
		await writeFile(
			agentsPath,
			source.replace("smoke-test instruction", "edited instruction"),
		);

		expect(
			planUpdate({
				pack: packVersionTwo,
				context: environment.context,
			}),
		).rejects.toMatchObject({ code: "DRIFT" });

		const malformedEnvironment = await createEnvironment();
		await initialize(malformedEnvironment, ["codex"]);
		await writeFile(
			join(malformedEnvironment.repository, "AGENTS.md"),
			"<!-- agents-pack:start id=ap-smoke-instructions version=0.1.0 -->\n",
		);

		expect(
			planUpdate({
				pack: packVersionTwo,
				context: malformedEnvironment.context,
			}),
		).rejects.toMatchObject({ code: "DRIFT" });
	});

	test("preserves explicit selection and adds a component only when it becomes required", async () => {
		const environment = await createEnvironment();
		await initialize(environment, ["claude"], ["ap-smoke-instructions"]);

		const preserved = await planUpdate({
			pack: packVersionTwo,
			context: environment.context,
		});
		expect(
			preserved.operations.some((operation) =>
				operation.path.includes("agents-pack-smoke-test"),
			),
		).toBe(false);

		const requiredPack: LoadedPack = {
			...packVersionTwo,
			manifest: {
				...packVersionTwo.manifest,
				components: packVersionTwo.manifest.components.map((component) =>
					component.id === "agents-pack-smoke-test"
						? { ...component, selection: "required" as const }
						: component,
				),
			},
		};
		const requiredPlan = await planUpdate({
			pack: requiredPack,
			context: environment.context,
		});

		expect(
			requiredPlan.operations.some(
				(operation) =>
					operation.kind === "create-file" &&
					operation.path === ".claude/skills/agents-pack-smoke-test/SKILL.md",
			),
		).toBe(true);
		const configOperation = requiredPlan.operations.find(
			(operation) => operation.path === ".agents-pack/pack.toml",
		);
		expect(configOperation?.kind).toBe("replace-file");

		if (configOperation?.kind === "replace-file") {
			expect(decoder.decode(configOperation.bytes)).toContain(
				'"agents-pack-smoke-test"',
			);
		}
	});

	test("refuses an update that removes a selected component", async () => {
		const environment = await createEnvironment();
		await initialize(environment, ["claude"]);
		const missingSelected: LoadedPack = {
			...packVersionTwo,
			manifest: {
				...packVersionTwo.manifest,
				components: packVersionTwo.manifest.components.filter(
					(component) => component.id !== "agents-pack-smoke-test",
				),
			},
		};

		expect(
			planUpdate({
				pack: missingSelected,
				context: environment.context,
			}),
		).rejects.toMatchObject({
			code: "UNKNOWN_COMPONENT",
		});
	});
});

describe("eject planning", () => {
	test("creates a deterministic clean eject plan", async () => {
		const environment = await createEnvironment();
		await initialize(environment, ["claude", "codex", "cursor"]);

		const first = await planEject({ context: environment.context });
		const second = await planEject({ context: environment.context });

		expect(first).toEqual(second);
		await expectGoldenPlan(first, "eject-plan.txt");
	});

	test("refuses eject when managed content drifted", async () => {
		const environment = await createEnvironment();
		await initialize(environment, ["codex"]);
		const agentsPath = join(environment.repository, "AGENTS.md");
		const source = await readFile(agentsPath, "utf8");
		await writeFile(
			agentsPath,
			source.replace("smoke-test instruction", "edited instruction"),
		);

		expect(planEject({ context: environment.context })).rejects.toMatchObject({
			code: "DRIFT",
		});

		const missingEnvironment = await createEnvironment();
		await initialize(missingEnvironment, ["claude"]);
		await rm(
			join(
				missingEnvironment.repository,
				".claude/rules/agents-pack/ap-smoke-instructions.md",
			),
		);

		expect(
			planEject({ context: missingEnvironment.context }),
		).rejects.toMatchObject({ code: "DRIFT" });
	});
});

async function initialize(
	environment: TestEnvironment,
	targets: ("claude" | "codex" | "cursor")[],
	components?: string[],
): Promise<void> {
	const plan = await planInit({
		pack: packVersionOne,
		scope: "repository",
		targets,
		components,
		context: environment.context,
	});
	await materializePlan(environment.repository, plan);
}

async function materializePlan(root: string, plan: ChangePlan): Promise<void> {
	for (const operation of plan.operations) {
		const absolutePath = join(root, ...operation.path.split("/"));

		switch (operation.kind) {
			case "create-file":
			case "replace-file":
				await mkdir(dirname(absolutePath), { recursive: true });
				await writeFile(absolutePath, operation.bytes);
				break;
			case "remove-file":
				await rm(absolutePath, { force: true });
				break;
			case "insert-block": {
				const current = await readFileOrEmpty(absolutePath);
				await mkdir(dirname(absolutePath), { recursive: true });
				await writeFile(
					absolutePath,
					insertManagedBlock(current, operation.bytes),
				);
				break;
			}
			case "replace-block": {
				const current = new Uint8Array(await readFile(absolutePath));
				await writeFile(
					absolutePath,
					replaceManagedBlock(current, operation.bytes),
				);
				break;
			}
			case "remove-block": {
				const current = new Uint8Array(await readFile(absolutePath));
				await writeFile(absolutePath, removeManagedBlock(current));
				break;
			}
			case "remove-empty-directory":
				await rmdir(absolutePath).catch((error: unknown) => {
					if (!isIgnorableDirectoryError(error)) {
						throw error;
					}
				});
				break;
		}
	}
}

async function expectGoldenPlan(
	plan: ChangePlan,
	goldenName: string,
): Promise<void> {
	const golden = await Bun.file(
		join(PROJECT_ROOT, "tests/fixtures/golden", goldenName),
	).text();
	expect(formatChangePlan(plan)).toBe(golden);
}

async function snapshotTree(root: string): Promise<string[]> {
	const entries: string[] = [];

	async function visit(directory: string): Promise<void> {
		const children = await readdir(directory, { withFileTypes: true });

		for (const child of children.sort((left, right) =>
			left.name.localeCompare(right.name),
		)) {
			const absolute = join(directory, child.name);
			const portable = absolute.slice(root.length + 1);

			if (child.isDirectory()) {
				entries.push(`${portable}/`);
				await visit(absolute);
			} else {
				const bytes = await readFile(absolute);
				entries.push(`${portable}:${Buffer.from(bytes).toString("hex")}`);
			}
		}
	}

	await visit(root);
	return entries;
}

async function createEnvironment(): Promise<TestEnvironment> {
	const container = await mkdtemp(join(tmpdir(), "agents-pack-plan-"));
	temporaryDirectories.push(container);
	const repository = join(container, "repository");
	const userHome = join(container, "home");
	await mkdir(join(repository, ".git"), { recursive: true });
	await mkdir(userHome, { recursive: true });

	return {
		repository,
		userHome,
		context: {
			cwd: repository,
			userHome,
		},
	};
}

async function writePortable(
	root: string,
	path: string,
	bytes: Uint8Array,
): Promise<void> {
	const absolutePath = join(root, ...path.split("/"));
	await mkdir(dirname(absolutePath), { recursive: true });
	await writeFile(absolutePath, bytes);
}

async function readFileOrEmpty(path: string): Promise<Uint8Array> {
	try {
		return new Uint8Array(await readFile(path));
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") {
			return new Uint8Array();
		}

		throw error;
	}
}

function concatenate(parts: readonly Uint8Array[]): Uint8Array {
	const length = parts.reduce((total, part) => total + part.byteLength, 0);
	const result = new Uint8Array(length);
	let offset = 0;

	for (const part of parts) {
		result.set(part, offset);
		offset += part.byteLength;
	}

	return result;
}

function isIgnorableDirectoryError(error: unknown): boolean {
	return (
		isNodeError(error) &&
		(error.code === "ENOENT" || error.code === "ENOTEMPTY")
	);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error;
}

interface TestEnvironment {
	repository: string;
	userHome: string;
	context: PathContext;
}
