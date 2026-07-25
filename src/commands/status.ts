import { homedir } from "node:os";
import { resolve } from "node:path";
import { assertNoCommandArguments } from "../cli/arguments.ts";
import { formatStatusReport, getStatusReport } from "../core/status.ts";

export interface StatusCommandDependencies {
	cwd?: string;
	userHome?: string;
	write?: (text: string) => void;
}

export async function runStatus(
	args: readonly string[],
	dependencies: StatusCommandDependencies = {},
): Promise<void> {
	assertNoCommandArguments("status", args);
	const report = await getStatusReport({
		cwd: resolve(dependencies.cwd ?? process.cwd()),
		userHome: resolve(dependencies.userHome ?? homedir()),
	});
	(dependencies.write ?? ((text: string) => process.stdout.write(text)))(
		formatStatusReport(report),
	);
}
