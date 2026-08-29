import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { COMMAND_NAMES } from "../../src/cli/arguments.ts";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");

describe("CLI help", () => {
	test("shows general help", async () => {
		const result = await runCli(["--help"]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Usage:");
		expect(result.stdout).toContain("agents-pack <command>");
		expect(result.stderr).toBe("");
	});

	test("shows the CLI version", async () => {
		const result = await runCli(["--version"]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toBe("agents-pack 0.2.0\n");
		expect(result.stderr).toBe("");
	});

	test("rejects extra arguments after the CLI version flag", async () => {
		const result = await runCli(["--version", "extra"]);

		expect(result.exitCode).toBe(2);
		expect(result.stdout).toBe("");
		expect(result.stderr).toContain("does not accept additional arguments");
	});

	for (const command of COMMAND_NAMES) {
		test(`shows help for ${command}`, async () => {
			const result = await runCli([command, "--help"]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain(`Agents Pack: ${command}`);
			expect(result.stdout).toContain(`agents-pack ${command}`);
			expect(result.stderr).toBe("");
		});
	}

	test("returns a usage error for an unknown command", async () => {
		const result = await runCli(["unknown"]);

		expect(result.exitCode).toBe(2);
		expect(result.stderr).toContain("Unknown command: unknown");
	});

	test("requires complete init arguments", async () => {
		const result = await runCli(["init"]);

		expect(result.exitCode).toBe(2);
		expect(result.stderr).toContain("USAGE");
		expect(result.stderr).toContain("--scope");
	});
});

async function runCli(args: string[]): Promise<{
	exitCode: number;
	stdout: string;
	stderr: string;
}> {
	const child = Bun.spawn([process.execPath, "src/cli/main.ts", ...args], {
		cwd: PROJECT_ROOT,
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
