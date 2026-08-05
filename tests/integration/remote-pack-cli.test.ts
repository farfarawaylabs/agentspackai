import { afterEach, describe, expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { serializePackArtifact } from "../../src/core/base-cache.ts";
import { loadPack } from "../../src/core/pack.ts";
import { loadLockFile, loadScopeConfig } from "../../src/core/state.ts";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const CLI_PATH = join(PROJECT_ROOT, "src/cli/main.ts");
const PACK_V1 = join(PROJECT_ROOT, "fixtures/packs/0.1.0");
const CORE_PACK = join(PROJECT_ROOT, "content/packs/core");
const temporaryDirectories: string[] = [];
const servers: Bun.Server<unknown>[] = [];

afterEach(async () => {
	for (const server of servers.splice(0)) {
		await server.stop(true);
	}

	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("remote official packs", () => {
	test("initializes, checks, and updates without a local pack path", async () => {
		const environment = await createEnvironment();
		const nextPackRoot = await createNextCorePack();
		const versionOne = await loadPack(CORE_PACK);
		const versionTwo = await loadPack(nextPackRoot);
		const artifacts = new Map([
			["0.27.0", serializePackArtifact(versionOne, { kind: "official" })],
			["0.28.0", serializePackArtifact(versionTwo, { kind: "official" })],
		]);
		let latest = "0.27.0";
		let baseUrl = "";
		const server = Bun.serve({
			hostname: "127.0.0.1",
			port: 0,
			fetch(request) {
				const url = new URL(request.url);

				if (url.pathname === "/registry.json") {
					return Response.json({
						schema_version: 1,
						packs: {
							"agents-pack-core": {
								latest,
								tag_prefix: "pack-core-v",
								versions: Object.fromEntries(
									[...artifacts.keys()].map((version) => [
										version,
										{
											url: `${baseUrl}/packs/${version}.pack`,
										},
									]),
								),
							},
						},
					});
				}

				const match = url.pathname.match(/^\/packs\/(.+)\.pack$/);
				const version = match?.[1];
				const artifact =
					version === undefined ? undefined : artifacts.get(version);
				return artifact === undefined
					? new Response("Not found", { status: 404 })
					: new Response(new TextDecoder().decode(artifact));
			},
		});
		servers.push(server);
		baseUrl = `http://127.0.0.1:${server.port}`;
		environment.registryUrl = `${baseUrl}/registry.json`;

		const initialized = await runCli(environment, [
			"init",
			"--scope",
			"repository",
			"--agents",
			"claude,codex,cursor",
			"--components",
			"recommended",
			"--yes",
		]);

		expect(initialized.exitCode).toBe(0);
		expect(initialized.stdout).toContain("agents-pack-core@0.27.0");
		expect((await loadScopeConfig(environment.configPath)).pack.source).toBe(
			"official",
		);

		latest = "0.28.0";
		const checked = await runCli(environment, ["update", "--check"]);
		expect(checked.exitCode).toBe(0);
		expect(checked.stdout).toContain("Candidate: agents-pack-core@0.28.0");
		expect(checked.stdout).toContain("Status: Update available.");

		const updated = await runCli(environment, ["update", "--yes"]);
		expect(updated.exitCode).toBe(0);
		expect((await loadLockFile(environment.lockPath)).pack.version).toBe(
			"0.28.0",
		);
	});

	test("requires an explicit candidate for a local-pack installation", async () => {
		const environment = await createEnvironment();
		const initialized = await runCli(environment, [
			"init",
			"--scope",
			"repository",
			"--agents",
			"claude",
			"--components",
			"recommended",
			"--pack",
			PACK_V1,
			"--yes",
		]);
		expect(initialized.exitCode).toBe(0);

		const update = await runCli(environment, ["update", "--check"]);
		expect(update.exitCode).toBe(2);
		expect(update.stderr).toContain("uses a local pack");
		expect(update.stderr).toContain("Provide --pack");
	});
});

async function createEnvironment(): Promise<TestEnvironment> {
	const container = await mkdtemp(join(tmpdir(), "agents-pack-remote-"));
	temporaryDirectories.push(container);
	const repository = join(container, "repository");
	const userHome = join(container, "home");
	await mkdir(join(repository, ".git"), { recursive: true });
	await mkdir(userHome, { recursive: true });

	return {
		repository,
		userHome,
		configPath: join(repository, ".agents-pack/pack.toml"),
		lockPath: join(repository, ".agents-pack/lock.json"),
		registryUrl: "",
	};
}

async function createNextCorePack(): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), "agents-pack-next-core-"));
	temporaryDirectories.push(directory);
	await cp(CORE_PACK, directory, { recursive: true });
	const manifestPath = join(directory, "pack.toml");
	const manifest = await readFile(manifestPath, "utf8");
	await writeFile(
		manifestPath,
		manifest.replace('version = "0.27.0"', 'version = "0.28.0"'),
	);
	await writeFile(
		join(directory, "RELEASE_NOTES.md"),
		"# Agents Pack Core 0.28.0\n\n- Test remote update.\n",
	);
	return directory;
}

async function runCli(
	environment: TestEnvironment,
	args: readonly string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	const child = Bun.spawn([process.execPath, CLI_PATH, ...args], {
		cwd: environment.repository,
		env: {
			...process.env,
			HOME: environment.userHome,
			AGENTS_PACK_REGISTRY_URL: environment.registryUrl,
		},
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	return { exitCode, stdout, stderr };
}

interface TestEnvironment {
	repository: string;
	userHome: string;
	configPath: string;
	lockPath: string;
	registryUrl: string;
}
