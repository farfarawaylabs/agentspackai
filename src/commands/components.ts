import { homedir } from "node:os";
import { resolve } from "node:path";
import { parseComponentMutationArguments } from "../cli/arguments.ts";
import { confirmApply } from "../cli/prompts.ts";
import { loadCachedPack } from "../core/base-cache.ts";
import { AgentsPackError } from "../core/errors.ts";
import { formatChangePlan } from "../core/format-plan.ts";
import { detectInstalledScope } from "../core/inspect.ts";
import { planInstall, planRemove } from "../core/plan.ts";
import type { ChangePlan, ExecutorEvent, PathContext } from "../core/types.ts";
import { runMutation } from "../filesystem/transaction.ts";

type ComponentCommand = "install" | "remove";

export interface ComponentCommandDependencies {
	cwd?: string;
	userHome?: string;
	interactive?: boolean;
	write?: (text: string) => void;
	confirm?: () => Promise<boolean>;
	onExecutorEvent?: (event: ExecutorEvent) => void | Promise<void>;
}

export function runInstall(
	args: readonly string[],
	dependencies: ComponentCommandDependencies = {},
): Promise<void> {
	return runComponentCommand("install", args, dependencies);
}

export function runRemove(
	args: readonly string[],
	dependencies: ComponentCommandDependencies = {},
): Promise<void> {
	return runComponentCommand("remove", args, dependencies);
}

async function runComponentCommand(
	command: ComponentCommand,
	args: readonly string[],
	dependencies: ComponentCommandDependencies,
): Promise<void> {
	const context: PathContext = {
		cwd: resolve(dependencies.cwd ?? process.cwd()),
		userHome: resolve(dependencies.userHome ?? homedir()),
	};
	const interactive = dependencies.interactive ?? Boolean(process.stdin.isTTY);
	const write =
		dependencies.write ?? ((text: string) => process.stdout.write(text));
	const options = parseComponentMutationArguments(command, args);
	const state = await detectInstalledScope(context);

	if (state.status !== "installed") {
		throw new AgentsPackError(
			"NOT_INITIALIZED",
			"Agents Pack is not initialized.",
		);
	}

	const pack = await loadCachedPack(context.userHome, state.lock.pack.sha256);
	const createPlan = () =>
		command === "install"
			? planInstall({ pack, componentId: options.componentId, context })
			: planRemove({ pack, componentId: options.componentId, context });
	const apply = (approvedPlan?: ChangePlan) =>
		runMutation({
			paths: state.paths,
			command,
			createPlan: async () => {
				const currentPlan = await createPlan();

				if (
					approvedPlan !== undefined &&
					planSignature(currentPlan) !== planSignature(approvedPlan)
				) {
					throw new AgentsPackError(
						"DRIFT",
						`The ${command} plan changed after approval. Review and rerun it.`,
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
		writeResult(
			command,
			options.componentId,
			result.plan.operations.length,
			write,
		);
		return;
	}

	const approvedPlan = await createPlan();
	write(formatChangePlan(approvedPlan));

	if (options.dryRun) {
		write("Dry run only. No files changed.\n");
		return;
	}

	if (approvedPlan.operations.length === 0) {
		writeResult(command, options.componentId, 0, write);
		return;
	}

	if (!interactive) {
		throw new AgentsPackError(
			"USAGE",
			`Non-interactive ${command} requires --yes to apply changes.`,
			{ exitCode: 2 },
		);
	}

	if (!(await (dependencies.confirm ?? confirmApply)())) {
		write("Cancelled. No files changed.\n");
		return;
	}

	const result = await apply(approvedPlan);
	writeResult(
		command,
		options.componentId,
		result.plan.operations.length,
		write,
	);
}

function writeResult(
	command: ComponentCommand,
	componentId: string,
	operationCount: number,
	write: (text: string) => void,
): void {
	if (operationCount === 0) {
		write(
			command === "install"
				? `${componentId} is already installed. No changes applied.\n`
				: `${componentId} is already absent. No changes applied.\n`,
		);
		return;
	}

	write(
		command === "install"
			? `Installed ${componentId}.\n`
			: `Removed ${componentId}.\n`,
	);
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
