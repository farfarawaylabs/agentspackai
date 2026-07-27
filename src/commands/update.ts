import { homedir } from "node:os";
import { resolve } from "node:path";
import {
	parseUpdateArguments,
	type UpdateArguments,
} from "../cli/arguments.ts";
import { confirmApply, promptForPackPath } from "../cli/prompts.ts";
import { cachePack } from "../core/base-cache.ts";
import { AgentsPackError } from "../core/errors.ts";
import { formatChangePlan } from "../core/format-plan.ts";
import { detectInstalledScope } from "../core/inspect.ts";
import { loadPack } from "../core/pack.ts";
import { planUpdate } from "../core/plan.ts";
import type { ChangePlan, ExecutorEvent, PathContext } from "../core/types.ts";
import { runMutation } from "../filesystem/transaction.ts";

export interface UpdateCommandDependencies {
	cwd?: string;
	userHome?: string;
	interactive?: boolean;
	write?: (text: string) => void;
	promptForPackPath?: () => Promise<string>;
	confirm?: () => Promise<boolean>;
	onExecutorEvent?: (event: ExecutorEvent) => void | Promise<void>;
}

export async function runUpdate(
	args: readonly string[],
	dependencies: UpdateCommandDependencies = {},
): Promise<void> {
	const cwd = resolve(dependencies.cwd ?? process.cwd());
	const userHome = resolve(dependencies.userHome ?? homedir());
	const interactive = dependencies.interactive ?? Boolean(process.stdin.isTTY);
	const write =
		dependencies.write ?? ((text: string) => process.stdout.write(text));
	const parsed = await completeArguments(
		parseUpdateArguments(args),
		interactive,
		dependencies,
	);
	const context: PathContext = { cwd, userHome };
	const pack = await loadPack(resolve(cwd, parsed.packPath));
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
			command: "update",
			createPlan: async () => {
				const currentPlan = await planUpdate({ pack, context });

				if (
					approvedPlan !== undefined &&
					planSignature(currentPlan) !== planSignature(approvedPlan)
				) {
					throw new AgentsPackError(
						"DRIFT",
						"The update plan changed after approval. Review and rerun it.",
					);
				}

				if (approvedPlan === undefined) {
					write(formatChangePlan(currentPlan));
				}

				return currentPlan;
			},
			onEvent: dependencies.onExecutorEvent,
		});

	if (parsed.yes && !parsed.dryRun) {
		const approvedPlan = await planUpdate({ pack, context });
		write(formatChangePlan(approvedPlan));
		await cachePack(userHome, pack);
		const result = await apply(approvedPlan);
		writeMutationResult(result, pack.manifest.id, pack.manifest.version, write);
		return;
	}

	const approvedPlan = await planUpdate({ pack, context });
	write(formatChangePlan(approvedPlan));

	if (parsed.dryRun) {
		write("Dry run only. No files changed.\n");
		return;
	}

	if (approvedPlan.operations.length === 0) {
		await cachePack(userHome, pack);
		write("Agents Pack is already at this version. No changes applied.\n");
		return;
	}

	if (!interactive) {
		throw new AgentsPackError(
			"USAGE",
			"Non-interactive update requires --yes to apply changes.",
			{ exitCode: 2 },
		);
	}

	if (!(await (dependencies.confirm ?? confirmApply)())) {
		write("Cancelled. No files changed.\n");
		return;
	}

	await cachePack(userHome, pack);
	const result = await apply(approvedPlan);
	writeMutationResult(result, pack.manifest.id, pack.manifest.version, write);
}

async function completeArguments(
	parsed: UpdateArguments,
	interactive: boolean,
	dependencies: UpdateCommandDependencies,
): Promise<Required<UpdateArguments>> {
	let packPath = parsed.packPath;

	if (packPath === undefined && interactive) {
		packPath = await (dependencies.promptForPackPath ?? promptForPackPath)();
	}

	if (packPath === undefined || packPath.trim().length === 0) {
		throw new AgentsPackError(
			"USAGE",
			"Update requires --pack in non-interactive mode.",
			{ exitCode: 2 },
		);
	}

	return {
		packPath,
		yes: parsed.yes,
		dryRun: parsed.dryRun,
	};
}

function writeMutationResult(
	result: Awaited<ReturnType<typeof runMutation>>,
	packId: string,
	packVersion: string,
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

	if (result.plan.operations.length === 0) {
		write("Agents Pack is already at this version. No changes applied.\n");
		return;
	}

	write(`Updated ${packId} to ${packVersion} in ${result.plan.scope} scope.\n`);
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
