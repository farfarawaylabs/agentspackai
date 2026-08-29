export interface ProcessResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export interface CommandRunner {
	isAvailable(command: string): boolean;
	run(
		command: string,
		args: readonly string[],
		env?: Readonly<Record<string, string | undefined>>,
	): Promise<ProcessResult>;
}

export function createCommandRunner(): CommandRunner {
	return {
		isAvailable: (command) => Bun.which(command) !== null,
		async run(command, args, env) {
			const child = Bun.spawn([command, ...args], {
				env: env === undefined ? process.env : { ...process.env, ...env },
				stdin: "ignore",
				stdout: "pipe",
				stderr: "pipe",
			});
			const [stdout, stderr, exitCode] = await Promise.all([
				new Response(child.stdout).text(),
				new Response(child.stderr).text(),
				child.exited,
			]);

			return { exitCode, stdout, stderr };
		},
	};
}
