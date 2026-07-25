import { homedir } from "node:os";
import { resolve } from "node:path";
import { parseEjectArguments } from "../cli/arguments.ts";
import { confirmApply } from "../cli/prompts.ts";
import { AgentsPackError } from "../core/errors.ts";
import { formatChangePlan } from "../core/format-plan.ts";
import { detectInstalledScope } from "../core/inspect.ts";
import { planEject } from "../core/plan.ts";
import type { ChangePlan, ExecutorEvent, PathContext } from "../core/types.ts";
import { runMutation } from "../filesystem/transaction.ts";

export interface EjectCommandDependencies {
	cwd?: string;
	userHome?: string;
	interactive?: boolean;
	write?: (text: string) => void;
	confirm?: () => Promise<boolean>;
	onExecutorEvent?: (event: ExecutorEvent) => void | Promise<void>;
}

export async function runEject(
	args: readonly string[],
	dependencies: EjectCommandDependencies = {},
): Promise<void> {
	const cwd = resolve(dependencies.cwd ?? process.cwd());
	const userHome = resolve(dependencies.userHome ?? homedir());
	const interactive = dependencies.interactive ?? Boolean(process.stdin.isTTY);
	const write =
		dependencies.write ?? ((text: string) => process.stdout.write(text));
	const options = parseEjectArguments(args);
	const context: PathContext = { cwd, userHome };
	const state = await detectInstalledScope(context);

	if (state.status !== "installed") {
		throw new AgentsPackError(
			"NOT_INITIALIZED",
			"Agents Pack is not initialized.",
		);
	}

	const apply = (approvedPlan?: ChangePlan) =>
		runMutation({
			paths: state.paths,
			command: "eject",
			createPlan: async () => {
				const currentPlan = await planEject({ context });

				if (
					approvedPlan !== undefined &&
					planSignature(currentPlan) !== planSignature(approvedPlan)
				) {
					throw new AgentsPackError(
						"DRIFT",
						"The eject plan changed after approval. Review and rerun it.",
					);
				}

				if (approvedPlan === undefined) {
					write(formatChangePlan(currentPlan));
				}

				return currentPlan;
			},
			onEvent: dependencies.onExecutorEvent,
		});

	if (options.yes && !options.dryRun) {
		const result = await apply();
		writeMutationResult(result, write);
		return;
	}

	const approvedPlan = await planEject({ context });
	write(formatChangePlan(approvedPlan));

	if (options.dryRun) {
		write("Dry run only. No files changed.\n");
		return;
	}

	if (!interactive) {
		throw new AgentsPackError(
			"USAGE",
			"Non-interactive eject requires --yes to apply changes.",
			{ exitCode: 2 },
		);
	}

	if (!(await (dependencies.confirm ?? confirmApply)())) {
		write("Cancelled. No files changed.\n");
		return;
	}

	const result = await apply(approvedPlan);
	writeMutationResult(result, write);
}

function writeMutationResult(
	result: Awaited<ReturnType<typeof runMutation>>,
	write: (text: string) => void,
): void {
	if (result.recoveredTransactions.length > 0) {
		write(
			`Recovered ${result.recoveredTransactions.length} unfinished transaction(s).\n`,
		);
	}

	if (result.staleLockRecovered) {
		write("Recovered a stale operation lock.\n");
	}

	write(`Ejected Agents Pack from ${result.plan.scope} scope.\n`);
}

function planSignature(plan: ChangePlan): string {
	return JSON.stringify({
		command: plan.command,
		scope: plan.scope,
		warnings: plan.warnings,
		operations: plan.operations.map((operation) => ({
			...operation,
			...("bytes" in operation
				? { bytes: Buffer.from(operation.bytes).toString("base64") }
				: {}),
		})),
	});
}
