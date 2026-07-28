import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
	chmod,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const temporaryRoots: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })),
	);
});

describe("public installer", () => {
	test("resolves the registry, verifies the archive, and installs atomically", async () => {
		const fixture = await createInstallerFixture();

		try {
			const result = await runInstaller(fixture);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("Installed agents-pack 0.1.0");
			expect(result.stderr).toBe("");
			expect(
				await runExecutable(join(fixture.installDirectory, "agents-pack")),
			).toBe("agents-pack 0.1.0\n");

			const repeated = await runInstaller(fixture);
			expect(repeated.exitCode).toBe(0);
			expect(repeated.stdout).toContain("Installed agents-pack 0.1.0");
		} finally {
			fixture.server.stop(true);
		}
	});

	test("rejects a checksum mismatch without installing", async () => {
		const fixture = await createInstallerFixture({ corruptChecksum: true });
		const installPath = join(fixture.installDirectory, "agents-pack");
		await mkdir(fixture.installDirectory, { recursive: true });
		await writeFile(installPath, "existing executable");

		try {
			const result = await runInstaller(fixture);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("Checksum verification failed");
			expect(await readFile(installPath, "utf8")).toBe("existing executable");
		} finally {
			fixture.server.stop(true);
		}
	});

	test("installs an exact version without reading the registry", async () => {
		const fixture = await createInstallerFixture();

		try {
			const result = await runInstaller(fixture, {
				version: "0.1.0",
				registryUrl: "http://127.0.0.1:1/unavailable.json",
			});

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("Installed agents-pack 0.1.0");
		} finally {
			fixture.server.stop(true);
		}
	});

	test("refuses to replace a symlink destination", async () => {
		const fixture = await createInstallerFixture();
		const protectedFile = join(fixture.root, "protected");
		await mkdir(fixture.installDirectory, { recursive: true });
		await writeFile(protectedFile, "keep me");
		await symlink(protectedFile, join(fixture.installDirectory, "agents-pack"));

		try {
			const result = await runInstaller(fixture);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("Refusing to replace a symlink");
			expect(await readFile(protectedFile, "utf8")).toBe("keep me");
		} finally {
			fixture.server.stop(true);
		}
	});
});

interface InstallerFixture {
	root: string;
	installDirectory: string;
	registryUrl: string;
	downloadBaseUrl: string;
	server: ReturnType<typeof Bun.serve>;
}

async function createInstallerFixture(
	options: { corruptChecksum?: boolean } = {},
): Promise<InstallerFixture> {
	const root = await mkdtemp(join(tmpdir(), "agents-pack-installer-"));
	temporaryRoots.push(root);
	const staging = join(root, "staging");
	const release = join(root, "cli-v0.1.0");
	const installDirectory = join(root, "bin");
	await mkdir(staging, { recursive: true });
	await mkdir(release, { recursive: true });

	const target = releaseTarget();
	const asset = `agents-pack-0.1.0-${target}.tar.gz`;
	const executable = join(staging, "agents-pack");
	await writeFile(executable, '#!/bin/sh\nprintf "agents-pack 0.1.0\\n"\n');
	await chmod(executable, 0o755);
	await runProcess([
		"tar",
		"-C",
		staging,
		"-czf",
		join(release, asset),
		"agents-pack",
	]);

	const archive = await readFile(join(release, asset));
	const digest = createHash("sha256").update(archive).digest("hex");
	const publishedDigest = options.corruptChecksum ? "0".repeat(64) : digest;
	await writeFile(
		join(release, "agents-pack-0.1.0-checksums.txt"),
		`${publishedDigest}  ${asset}\n`,
	);
	await writeFile(
		join(root, "cli.json"),
		JSON.stringify({ schema_version: 1, latest: "0.1.0" }),
	);

	const server = Bun.serve({
		port: 0,
		async fetch(request) {
			const pathname = new URL(request.url).pathname;
			const routes: Record<string, string> = {
				"/registry/v1/cli.json": join(root, "cli.json"),
				[`/cli-v0.1.0/${asset}`]: join(release, asset),
				"/cli-v0.1.0/agents-pack-0.1.0-checksums.txt": join(
					release,
					"agents-pack-0.1.0-checksums.txt",
				),
			};
			const path = routes[pathname];

			if (path === undefined) {
				return new Response("Not found", { status: 404 });
			}

			return new Response(Bun.file(path));
		},
	});
	const origin = `http://127.0.0.1:${server.port}`;

	return {
		root,
		installDirectory,
		registryUrl: `${origin}/registry/v1/cli.json`,
		downloadBaseUrl: `${origin}/cli-v`,
		server,
	};
}

async function runInstaller(
	fixture: InstallerFixture,
	options: { version?: string; registryUrl?: string } = {},
): Promise<{
	exitCode: number;
	stdout: string;
	stderr: string;
}> {
	const child = Bun.spawn(["sh", "install.sh"], {
		cwd: PROJECT_ROOT,
		env: {
			...process.env,
			AGENTS_PACK_REGISTRY_URL: options.registryUrl ?? fixture.registryUrl,
			AGENTS_PACK_DOWNLOAD_BASE_URL: fixture.downloadBaseUrl,
			AGENTS_PACK_INSTALL_DIR: fixture.installDirectory,
			...(options.version === undefined
				? {}
				: { AGENTS_PACK_VERSION: options.version }),
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

async function runExecutable(path: string): Promise<string> {
	const child = Bun.spawn([path, "--version"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);

	expect(exitCode).toBe(0);
	expect(stderr).toBe("");
	return stdout;
}

async function runProcess(command: string[]): Promise<void> {
	const child = Bun.spawn(command, {
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stderr, exitCode] = await Promise.all([
		new Response(child.stderr).text(),
		child.exited,
	]);

	if (exitCode !== 0) {
		throw new Error(`${command[0]} failed: ${stderr}`);
	}
}

function releaseTarget(): string {
	const platform =
		process.platform === "darwin"
			? "darwin"
			: process.platform === "linux"
				? "linux"
				: undefined;
	const architecture =
		process.arch === "arm64"
			? "arm64"
			: process.arch === "x64"
				? "x64"
				: undefined;

	if (platform === undefined || architecture === undefined) {
		throw new Error(
			`Unsupported installer test host: ${process.platform}-${process.arch}`,
		);
	}

	return `${platform}-${architecture}`;
}
