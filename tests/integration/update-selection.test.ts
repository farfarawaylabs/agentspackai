import { afterEach, describe, expect, test } from "bun:test";
import {
	cp,
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { runInit } from "../../src/commands/init.ts";
import { runUpdate } from "../../src/commands/update.ts";
import { runPin } from "../../src/commands/version-control.ts";
import { getBaseCachePath } from "../../src/core/base-cache.ts";
import { AgentsPackError } from "../../src/core/errors.ts";
import { resolveScopePaths } from "../../src/core/paths.ts";
import { loadLockFile, loadScopeConfig } from "../../src/core/state.ts";
import type { PackComponent, Scope } from "../../src/core/types.ts";

const ROOT = resolve(import.meta.dir, "../..");
const REQUIRED = "ap-smoke-instructions";
const OLD = "agents-pack-smoke-test";
const NEW = ["ap-new-skill", "ap-new-agent", "ap-new-instruction"];
const directories: string[] = [];

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

describe("component additions during update", () => {
	for (const scope of ["repository", "global"] as const) {
		test(`offers only new compatible components of every kind in ${scope} scope`, async () => {
			const env = await setup(scope);
			let offered: readonly PackComponent[] = [];
			await runUpdate(["--pack", env.candidate], {
				...env.dependencies,
				interactive: true,
				promptForNewComponents: async (components) => {
					offered = components;
					return NEW;
				},
				confirm: async () => true,
			});
			expect(offered.map((c) => c.id).sort()).toEqual([...NEW].sort());
			expect(offered.map((c) => c.kind).sort()).toEqual([
				"instruction",
				"skill",
				"subagent",
			]);
			expect((await loadScopeConfig(env.config)).components.sort()).toEqual(
				[REQUIRED, "ap-required-new", ...NEW].sort(),
			);
			expect(
				await readFile(
					join(env.installRoot, ".claude/agents/ap-new-agent.md"),
					"utf8",
				),
			).toContain("New agent instructions");
			expect(
				await readFile(
					join(env.installRoot, ".claude/skills/ap-new-skill/SKILL.md"),
					"utf8",
				),
			).toContain("ap-new-skill");
			expect(
				await readFile(
					join(
						env.installRoot,
						".claude/rules/agents-pack/ap-new-instruction.md",
					),
					"utf8",
				),
			).toContain("ap-new-instruction");
		});
	}

	test("keeps existing selections, skips declined additions, and does not prompt again for the same version", async () => {
		const env = await setup("repository", [REQUIRED, OLD]);
		await runUpdate(["--pack", env.candidate], {
			...env.dependencies,
			interactive: true,
			promptForNewComponents: async () => [],
			confirm: async () => true,
		});
		expect((await loadScopeConfig(env.config)).components.sort()).toEqual(
			[REQUIRED, OLD, "ap-required-new"].sort(),
		);
		await runUpdate(["--pack", env.candidate], {
			...env.dependencies,
			interactive: true,
			promptForNewComponents: unexpectedPrompt,
		});
	});

	test("check and dry-run list additions without prompting or writing, and --yes does not opt in", async () => {
		const env = await setup();
		const before = await snapshot(env.installRoot);
		const homeBefore = await snapshot(env.userHome);
		let output = "";
		for (const flag of ["--check", "--dry-run"]) {
			await runUpdate(["--pack", env.candidate, flag], {
				...env.dependencies,
				interactive: true,
				promptForNewComponents: unexpectedPrompt,
				write: (text) => {
					output += text;
				},
			});
			expect(await snapshot(env.installRoot)).toEqual(before);
			expect(await snapshot(env.userHome)).toEqual(homeBefore);
		}
		expect(output).toContain("New components in this update:");
		for (const id of NEW) expect(output).toContain(id);
		expect(output).toContain("required, added automatically");
		expect(output).not.toContain("ap-cursor-only");
		await runUpdate(["--pack", env.candidate, "--yes"], {
			...env.dependencies,
			interactive: true,
			promptForNewComponents: unexpectedPrompt,
		});
		expect((await loadScopeConfig(env.config)).components.sort()).toEqual(
			[REQUIRED, "ap-required-new"].sort(),
		);
	});

	test("--add previews and installs extras in one update, then permits adding a previously unselected component", async () => {
		const env = await setup();
		const args = ["--pack", env.candidate, "--add", NEW.join(",")];
		const before = await snapshot(env.installRoot);
		await runUpdate([...args, "--dry-run"], env.dependencies);
		expect(await snapshot(env.installRoot)).toEqual(before);
		await runUpdate([...args, "--yes"], env.dependencies);
		expect((await loadScopeConfig(env.config)).components.sort()).toEqual(
			[REQUIRED, "ap-required-new", ...NEW].sort(),
		);
		expect((await loadLockFile(env.lock)).pack.version).toBe("0.2.0");
		await runUpdate(
			["--pack", env.candidate, "--add", OLD, "--yes"],
			env.dependencies,
		);
		expect((await loadScopeConfig(env.config)).components).toContain(OLD);
	});

	test("rejects unknown or incompatible additions without writing", async () => {
		const env = await setup();
		const before = await snapshot(env.installRoot);
		for (const [id, code] of [
			["missing", "UNKNOWN_COMPONENT"],
			["ap-cursor-only", "INCOMPATIBLE_COMPONENT"],
		] as const) {
			await expect(
				runUpdate(
					["--pack", env.candidate, "--add", id, "--yes"],
					env.dependencies,
				),
			).rejects.toMatchObject({ code });
		}
		expect(await snapshot(env.installRoot)).toEqual(before);
	});

	test("cancelling selection or final approval leaves installation and cache unchanged", async () => {
		const env = await setup();
		const before = await snapshot(env.installRoot);
		const homeBefore = await snapshot(env.userHome);
		await expect(
			runUpdate(["--pack", env.candidate], {
				...env.dependencies,
				interactive: true,
				promptForNewComponents: async () => {
					throw new AgentsPackError("CANCELLED", "Cancelled.", { exitCode: 0 });
				},
			}),
		).rejects.toMatchObject({ code: "CANCELLED" });
		await runUpdate(["--pack", env.candidate], {
			...env.dependencies,
			interactive: true,
			promptForNewComponents: async () => NEW,
			confirm: async () => false,
		});
		expect(await snapshot(env.installRoot)).toEqual(before);
		expect(await snapshot(env.userHome)).toEqual(homeBefore);
	});

	test("validates pinned installs before offering additions", async () => {
		const env = await setup();
		await runPin([], env.dependencies);
		const before = await snapshot(env.installRoot);
		await expect(
			runUpdate(["--pack", env.candidate], {
				...env.dependencies,
				interactive: true,
				promptForNewComponents: unexpectedPrompt,
			}),
		).rejects.toMatchObject({ code: "PINNED" });
		expect(await snapshot(env.installRoot)).toEqual(before);
	});

	test("rechecks added destinations after approval and preserves a newly created user file", async () => {
		const env = await setup();
		const destination = join(env.installRoot, ".claude/agents/ap-new-agent.md");
		await expect(
			runUpdate(["--pack", env.candidate], {
				...env.dependencies,
				interactive: true,
				promptForNewComponents: async () => NEW,
				confirm: async () => {
					await mkdir(dirname(destination), { recursive: true });
					await writeFile(destination, "User-created agent\n");
					return true;
				},
			}),
		).rejects.toMatchObject({ code: "OWNERSHIP_CONFLICT" });
		expect(await readFile(destination, "utf8")).toBe("User-created agent\n");
		expect((await loadLockFile(env.lock)).pack.version).toBe("0.1.0");
		expect((await loadScopeConfig(env.config)).components).toEqual([REQUIRED]);
	});

	test("rolls back the version and added outputs together on a failed update", async () => {
		const env = await setup();
		const before = await snapshot(env.installRoot);
		await expect(
			runUpdate(["--pack", env.candidate, "--add", NEW.join(","), "--yes"], {
				...env.dependencies,
				onExecutorEvent: (event) => {
					if (event.point === "after-operation" && event.operationIndex === 1)
						throw new Error("Injected failure");
				},
			}),
		).rejects.toMatchObject({ code: "EXECUTION_FAILED" });
		expect(await snapshot(env.installRoot)).toEqual(before);
	});

	test("missing previous cache does not block updating and reports the discovery limit", async () => {
		const env = await setup();
		const lock = await loadLockFile(env.lock);
		await rm(getBaseCachePath(env.userHome, lock.pack.sha256));
		let output = "";
		await runUpdate(["--pack", env.candidate, "--yes"], {
			...env.dependencies,
			write: (text) => {
				output += text;
			},
		});
		expect(output).toContain("New-component discovery unavailable");
		expect((await loadLockFile(env.lock)).pack.version).toBe("0.2.0");
		expect((await loadScopeConfig(env.config)).components.sort()).toEqual(
			[REQUIRED, "ap-required-new"].sort(),
		);
	});
});

async function unexpectedPrompt(): Promise<never> {
	throw new Error("Unexpected component picker");
}

async function setup(scope: Scope = "repository", selected = [REQUIRED]) {
	const root = await mkdtemp(join(tmpdir(), "agents-pack-update-selection-"));
	directories.push(root);
	const cwd = join(root, "repository");
	const userHome = join(root, "home");
	await mkdir(join(cwd, ".git"), { recursive: true });
	await mkdir(userHome);
	const dependencies = {
		cwd,
		userHome,
		interactive: false,
		write: (_text: string) => {},
	};
	await runInit(
		[
			"--scope",
			scope,
			"--agents",
			"claude",
			"--components",
			selected.join(","),
			"--pack",
			join(ROOT, "fixtures/packs/0.1.0"),
			"--yes",
		],
		dependencies,
	);
	const candidate = join(root, "candidate");
	await cp(join(ROOT, "fixtures/packs/0.2.0"), candidate, { recursive: true });
	let manifest = await readFile(join(candidate, "pack.toml"), "utf8");
	const additions = [
		{
			id: "ap-new-skill",
			kind: "skill",
			selection: "optional",
			category: "design/creative",
		},
		{
			id: "ap-new-agent",
			kind: "subagent",
			selection: "recommended",
			category: "design/creative",
		},
		{
			id: "ap-new-instruction",
			kind: "instruction",
			selection: "optional",
			category: "design/creative",
		},
		{
			id: "ap-required-new",
			kind: "instruction",
			selection: "required",
			category: "core",
		},
		{
			id: "ap-cursor-only",
			kind: "instruction",
			selection: "optional",
			category: "design/creative",
		},
	];
	for (const c of additions) {
		const source =
			c.kind === "instruction"
				? `instructions/${c.id}.md`
				: `${c.kind}s/${c.id}`;
		manifest += `\n[[components]]\nid = "${c.id}"\nkind = "${c.kind}"\ntitle = "${c.id}"\nsummary = "Use ${c.id} for testing."\ncategory = "${c.category}"\nselection = "${c.selection}"\nsource = "${source}"\ntargets = ["${c.id === "ap-cursor-only" ? "cursor" : "claude"}"]\n`;
		const path = join(candidate, source);
		if (c.kind === "instruction") {
			await mkdir(dirname(path), { recursive: true });
			await writeFile(path, `# ${c.id}\nTest instructions.\n`);
		} else {
			await mkdir(path, { recursive: true });
			if (c.kind === "skill")
				await writeFile(
					join(path, "SKILL.md"),
					`---\nname: ${c.id}\ndescription: Use for testing.\n---\n# Test skill\n`,
				);
			else {
				await writeFile(
					join(path, "instructions.md"),
					"New agent instructions\n",
				);
				await writeFile(
					join(path, "agent.toml"),
					`schema_version = 1\nname = "${c.id}"\ndescription = "Use for testing."\n[execution]\nfilesystem = "read-only"\nreasoning_effort = "high"\n`,
				);
			}
		}
	}
	await writeFile(join(candidate, "pack.toml"), manifest);
	const paths = await resolveScopePaths(scope, { cwd, userHome });
	return {
		dependencies,
		candidate,
		userHome,
		installRoot: paths.root,
		config: paths.configPath,
		lock: paths.lockPath,
	};
}

async function snapshot(root: string): Promise<string[]> {
	const result: string[] = [];
	async function visit(path: string) {
		for (const entry of await readdir(path, { withFileTypes: true })) {
			const child = join(path, entry.name);
			if (entry.isDirectory()) await visit(child);
			else
				result.push(
					`${child.slice(root.length)}:${(await readFile(child)).toString("hex")}`,
				);
		}
	}
	await visit(root);
	return result.sort();
}
