import { homedir } from "node:os";
import { resolve } from "node:path";
import { type InitArguments, parseInitArguments } from "../cli/arguments.ts";
import {
	confirmApply,
	promptForComponentChoice,
	promptForInitArguments,
} from "../cli/prompts.ts";
import { cachePack } from "../core/base-cache.ts";
import { AgentsPackError } from "../core/errors.ts";
import { formatChangePlan } from "../core/format-plan.ts";
import { loadPack } from "../core/pack.ts";
import { planInit } from "../core/plan.ts";
import { resolveScopePaths } from "../core/paths.ts";
import {
	expandComponentChoice,
	type ComponentChoice,
} from "../core/selection.ts";
import type {
	AgentTarget,
	ChangePlan,
	PathContext,
	Scope,
} from "../core/types.ts";
import { runMutation } from "../filesystem/transaction.ts";

export interface InitCommandDependencies {
	cwd?: string;
	userHome?: string;
	interactive?: boolean;
	write?: (text: string) => void;
	promptForArguments?: (partial: InitArguments) => Promise<InitArguments>;
	promptForComponents?: (
		pack: Awaited<ReturnType<typeof loadPack>>,
		targets: readonly AgentTarget[],
	) => Promise<ComponentChoice>;
	confirm?: () => Promise<boolean>;
}

export async function runInit(
	args: readonly string[],
	dependencies: InitCommandDependencies = {},
): Promise<void> {
	const cwd = resolve(dependencies.cwd ?? process.cwd());
	const userHome = resolve(dependencies.userHome ?? homedir());
	const interactive = dependencies.interactive ?? Boolean(process.stdin.isTTY);
	const write =
		dependencies.write ?? ((text: string) => process.stdout.write(text));
	let parsed = parseInitArguments(args);

	if (hasMissingRequiredArguments(parsed)) {
		if (!interactive) {
			throw new AgentsPackError(
				"USAGE",
				"Non-interactive init requires --scope, --agents, --pack, and --components.",
				{ exitCode: 2 },
			);
		}

		parsed = await (dependencies.promptForArguments ?? promptForInitArguments)(
			parsed,
		);
	}

	const options = requireCompleteArguments(parsed);
	const context: PathContext = { cwd, userHome };
	const pack = await loadPack(resolve(cwd, options.packPath));
	const choice =
		options.components ??
		(await (dependencies.promptForComponents ?? promptForComponentChoice)(
			pack,
			options.agents,
		));
	const components = expandComponentChoice(
		pack.manifest,
		options.agents,
		choice,
	);
	const paths = await resolveScopePaths(options.scope, context);
	const apply = (approvedPlan?: ChangePlan) =>
		runMutation({
			paths,
			command: "init",
			createPlan: async () => {
				const currentPlan = await planInit({
					pack,
					scope: options.scope,
					targets: options.agents,
					components,
					context,
				});

				if (
					approvedPlan !== undefined &&
					planSignature(currentPlan) !== planSignature(approvedPlan)
				) {
					throw new AgentsPackError(
						"DRIFT",
						"The initialization plan changed after approval. Review and rerun it.",
					);
				}

				if (approvedPlan === undefined) {
					write(formatChangePlan(currentPlan));
				}

				return currentPlan;
			},
		});

	if (options.yes && !options.dryRun) {
		const approvedPlan = await planInit({
			pack,
			scope: options.scope,
			targets: options.agents,
			components,
			context,
		});
		write(formatComponentSelection(pack, components));
		write(formatChangePlan(approvedPlan));
		await cachePack(userHome, pack);
		const result = await apply(approvedPlan);
		writeMutationResult(result, pack.manifest.id, pack.manifest.version, write);
		return;
	}

	const approvedPlan = await planInit({
		pack,
		scope: options.scope,
		targets: options.agents,
		components,
		context,
	});
	write(formatComponentSelection(pack, components));
	write(formatChangePlan(approvedPlan));

	if (options.dryRun) {
		write("Dry run only. No files changed.\n");
		return;
	}

	if (approvedPlan.operations.length === 0) {
		await cachePack(userHome, pack);
		write("Agents Pack is already initialized. No changes applied.\n");
		return;
	}

	if (!options.yes) {
		if (!interactive) {
			throw new AgentsPackError(
				"USAGE",
				"Non-interactive init requires --yes to apply changes.",
				{ exitCode: 2 },
			);
		}

		const confirmed = await (dependencies.confirm ?? confirmApply)();

		if (!confirmed) {
			write("Cancelled. No files changed.\n");
			return;
		}
	}

	await cachePack(userHome, pack);
	const result = await apply(approvedPlan);
	writeMutationResult(result, pack.manifest.id, pack.manifest.version, write);
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
		write("Agents Pack is already initialized. No changes applied.\n");
		return;
	}

	write(
		`Initialized ${packId}@${packVersion} in ${result.plan.scope} scope.\n`,
	);
}

function hasMissingRequiredArguments(options: InitArguments): boolean {
	return (
		options.scope === undefined ||
		options.agents === undefined ||
		options.packPath === undefined ||
		options.components === undefined
	);
}

function requireCompleteArguments(options: InitArguments): {
	scope: Scope;
	agents: AgentTarget[];
	packPath: string;
	components?: ComponentChoice;
	yes: boolean;
	dryRun: boolean;
} {
	if (
		options.scope === undefined ||
		options.agents === undefined ||
		options.packPath === undefined ||
		options.packPath.trim().length === 0
	) {
		throw new AgentsPackError(
			"USAGE",
			"Init requires a scope, at least one agent, and a local pack path.",
			{ exitCode: 2 },
		);
	}

	return {
		scope: options.scope,
		agents: options.agents,
		packPath: options.packPath,
		components: options.components,
		yes: options.yes,
		dryRun: options.dryRun,
	};
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

function formatComponentSelection(
	pack: Awaited<ReturnType<typeof loadPack>>,
	componentIds: readonly string[],
): string {
	const selected = new Set(componentIds);
	const lines = ["Selected components:"];

	for (const component of pack.manifest.components) {
		if (selected.has(component.id)) {
			lines.push(`  ${component.id} (${component.selection})`);
		}
	}

	return `${lines.join("\n")}\n\n`;
}
