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
import { join, resolve } from "node:path";
import { runInit } from "../../src/commands/init.ts";
import { runStatus } from "../../src/commands/status.ts";
import { runUpdate } from "../../src/commands/update.ts";
import { resolveScopePaths } from "../../src/core/paths.ts";
import { loadLockFile, loadScopeConfig } from "../../src/core/state.ts";

const ROOT = resolve(import.meta.dir, "../..");
const REQUIRED = "ap-smoke-instructions";
const REMOVED = "agents-pack-smoke-test";
const WARNING = `Selected component ${REMOVED} was removed in 0.2.0 and will be uninstalled. See the pack release notes for its replacement.`;
const directories: string[] = [];

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

describe("update to a pack that removed a selected component", () => {
	test("--check reports the removal without writing", async () => {
		const env = await setup();
		const before = await snapshot(env.cwd);
		const homeBefore = await snapshot(env.userHome);
		let output = "";
		await runUpdate(["--pack", env.candidate, "--check"], {
			...env.dependencies,
			write: (text) => {
				output += text;
			},
		});

		expect(output).toContain("Status: Update available.");
		expect(output).toContain(WARNING);
		expect(await snapshot(env.cwd)).toEqual(before);
		expect(await snapshot(env.userHome)).toEqual(homeBefore);
	});

	test("applies the update, uninstalls the component, and leaves clean state", async () => {
		const env = await setup();
		let output = "";
		await runUpdate(["--pack", env.candidate, "--yes"], {
			...env.dependencies,
			write: (text) => {
				output += text;
			},
		});

		expect(output).toContain(WARNING);
		expect(output).toContain(`REMOVE FILE .claude/skills/${REMOVED}/SKILL.md`);
		expect(output).toContain("Updated agents-pack-smoke to 0.2.0");
		expect(
			await readdir(join(env.cwd, ".claude/skills")).catch(() => []),
		).not.toContain(REMOVED);
		expect((await loadScopeConfig(env.config)).components).toEqual([REQUIRED]);
		const lock = await loadLockFile(env.lock);
		expect(lock.pack.version).toBe("0.2.0");
		expect(lock.components.map((component) => component.id)).toEqual([
			REQUIRED,
		]);

		let status = "";
		await runStatus([], {
			...env.dependencies,
			write: (text) => {
				status += text;
			},
		});
		expect(status).toContain(`Official components: ${REQUIRED}`);
		expect(status).not.toContain(REMOVED);
		expect(status).not.toMatch(/^\s+(modified|missing)/m);

		let repeated = "";
		await runUpdate(["--pack", env.candidate, "--check"], {
			...env.dependencies,
			write: (text) => {
				repeated += text;
			},
		});
		expect(repeated).toContain("Status: Already current.");
		expect(repeated).not.toContain("Warnings:");
	});
});

async function setup() {
	const root = await mkdtemp(join(tmpdir(), "agents-pack-update-removal-"));
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
			"repository",
			"--agents",
			"claude",
			"--components",
			[REQUIRED, REMOVED].join(","),
			"--pack",
			join(ROOT, "fixtures/packs/0.1.0"),
			"--yes",
		],
		dependencies,
	);
	const candidate = join(root, "candidate");
	await cp(join(ROOT, "fixtures/packs/0.2.0"), candidate, { recursive: true });
	await rm(join(candidate, "skills", REMOVED), { recursive: true });
	const manifest = await readFile(join(candidate, "pack.toml"), "utf8");
	const removedEntry = manifest.indexOf(`\n[[components]]\nid = "${REMOVED}"`);
	expect(removedEntry).toBeGreaterThan(0);
	await writeFile(
		join(candidate, "pack.toml"),
		`${manifest.slice(0, removedEntry)}\n`,
	);
	const paths = await resolveScopePaths("repository", { cwd, userHome });
	return {
		cwd,
		userHome,
		candidate,
		dependencies,
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
