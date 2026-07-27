import { homedir } from "node:os";
import { resolve } from "node:path";
import {
	parseCreateArguments,
	parseForkArguments,
	parseSyncArguments,
} from "../cli/arguments.ts";
import { confirmApply, promptForComponentDescription } from "../cli/prompts.ts";
import { loadCachedPack } from "../core/base-cache.ts";
import { AgentsPackError } from "../core/errors.ts";
import { formatChangePlan } from "../core/format-plan.ts";
import { detectInstalledScope } from "../core/inspect.ts";
import {
	planCreateUserComponent,
	planForkUserComponent,
	planSyncUserComponents,
} from "../core/user-plan.ts";
import type { ChangePlan, ExecutorEvent, PathContext } from "../core/types.ts";
import { runMutation } from "../filesystem/transaction.ts";

type UserCommand = "create" | "fork" | "sync";

export interface UserComponentCommandDependencies {
	cwd?: string;
	userHome?: string;
	interactive?: boolean;
	write?: (text: string) => void;
	confirm?: () => Promise<boolean>;
	promptForDescription?: () => Promise<string>;
	onExecutorEvent?: (event: ExecutorEvent) => void | Promise<void>;
}

export function runCreate(
	args: readonly string[],
	dependencies: UserComponentCommandDependencies = {},
): Promise<void> {
	return runUserComponentCommand("create", args, dependencies);
}

export function runFork(
	args: readonly string[],
	dependencies: UserComponentCommandDependencies = {},
): Promise<void> {
	return runUserComponentCommand("fork", args, dependencies);
}

export function runSync(
	args: readonly string[],
	dependencies: UserComponentCommandDependencies = {},
): Promise<void> {
	return runUserComponentCommand("sync", args, dependencies);
}

async function runUserComponentCommand(
	command: UserCommand,
	args: readonly string[],
	dependencies: UserComponentCommandDependencies,
): Promise<void> {
	const context: PathContext = {
		cwd: resolve(dependencies.cwd ?? process.cwd()),
		userHome: resolve(dependencies.userHome ?? homedir()),
	};
	const interactive = dependencies.interactive ?? Boolean(process.stdin.isTTY);
	const write =
		dependencies.write ?? ((text: string) => process.stdout.write(text));
	const state = await detectInstalledScope(context);

	if (state.status !== "installed") {
		throw new AgentsPackError(
			"NOT_INITIALIZED",
			"Agents Pack is not initialized.",
		);
	}

	let label: string;
	let dryRun: boolean;
	let yes: boolean;
	let createPlan: () => Promise<ChangePlan>;

	if (command === "create") {
		const options = parseCreateArguments(args);
		let description = options.description;

		if (description === undefined) {
			if (!interactive) {
				throw new AgentsPackError(
					"USAGE",
					"Non-interactive create requires --description.",
					{ exitCode: 2 },
				);
			}
			description = await (
				dependencies.promptForDescription ?? promptForComponentDescription
			)();
		}

		const officialPack = await loadCachedPack(
			context.userHome,
			state.lock.pack.sha256,
		);
		label = `${options.kind} ${options.name}`;
		dryRun = options.dryRun;
		yes = options.yes;
		createPlan = () =>
			planCreateUserComponent({
				officialPack,
				kind: options.kind,
				name: options.name,
				description,
				workspaceWrite: options.workspaceWrite,
				context,
			});
	} else if (command === "fork") {
		const options = parseForkArguments(args);
		const officialPack = await loadCachedPack(
			context.userHome,
			state.lock.pack.sha256,
		);
		label = `${options.componentId} as ${options.name}`;
		dryRun = options.dryRun;
		yes = options.yes;
		createPlan = () =>
			planForkUserComponent({
				officialPack,
				componentId: options.componentId,
				name: options.name,
				context,
			});
	} else {
		const options = parseSyncArguments(args);
		label = "user components";
		dryRun = options.dryRun;
		yes = options.yes;
		createPlan = () => planSyncUserComponents({ context });
	}

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

	if (yes && !dryRun) {
		const result = await apply();
		writeResult(command, label, result.plan.operations.length, write);
		return;
	}

	const approvedPlan = await createPlan();
	write(formatChangePlan(approvedPlan));

	if (dryRun) {
		write("Dry run only. No files changed.\n");
		return;
	}

	if (approvedPlan.operations.length === 0) {
		writeResult(command, label, 0, write);
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
	writeResult(command, label, result.plan.operations.length, write);
}

function writeResult(
	command: UserCommand,
	label: string,
	operationCount: number,
	write: (text: string) => void,
): void {
	if (operationCount === 0) {
		write(`No changes needed; ${label} is already synchronized.\n`);
		return;
	}

	if (command === "create") {
		write(
			`Created user-owned ${label}. Edit its canonical source under .agents-pack/user, then run agents-pack sync.\n`,
		);
		return;
	}

	if (command === "fork") {
		write(
			`Forked ${label}. The canonical user-owned copy is under .agents-pack/user.\n`,
		);
		return;
	}

	write("Synchronized user-owned components across selected agents.\n");
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
