import { homedir } from "node:os";
import { resolve } from "node:path";
import {
	assertNoCommandArguments,
	parseRollbackArguments,
} from "../cli/arguments.ts";
import { confirmApply } from "../cli/prompts.ts";
import { listCachedPacks } from "../core/base-cache.ts";
import { AgentsPackError } from "../core/errors.ts";
import { formatChangePlan } from "../core/format-plan.ts";
import { detectInstalledScope } from "../core/inspect.ts";
import { planPin, planRollback } from "../core/plan.ts";
import type {
	ChangePlan,
	ExecutorEvent,
	LoadedPack,
	PathContext,
} from "../core/types.ts";
import { compareVersions } from "../core/versions.ts";
import { runMutation } from "../filesystem/transaction.ts";

export interface VersionCommandDependencies {
	cwd?: string;
	userHome?: string;
	interactive?: boolean;
	write?: (text: string) => void;
	confirm?: () => Promise<boolean>;
	onExecutorEvent?: (event: ExecutorEvent) => void | Promise<void>;
}

export function runPin(
	args: readonly string[],
	dependencies: VersionCommandDependencies = {},
): Promise<void> {
	return runPinCommand(true, args, dependencies);
}

export function runUnpin(
	args: readonly string[],
	dependencies: VersionCommandDependencies = {},
): Promise<void> {
	return runPinCommand(false, args, dependencies);
}

async function runPinCommand(
	pinned: boolean,
	args: readonly string[],
	dependencies: VersionCommandDependencies,
): Promise<void> {
	const command = pinned ? "pin" : "unpin";
	assertNoCommandArguments(command, args);
	const context = createContext(dependencies);
	const state = await detectInstalledScope(context);

	if (state.status !== "installed") {
		throw new AgentsPackError(
			"NOT_INITIALIZED",
			"Agents Pack is not initialized.",
		);
	}

	const write =
		dependencies.write ?? ((text: string) => process.stdout.write(text));
	const result = await runMutation({
		paths: state.paths,
		command,
		createPlan: () => planPin({ context, pinned }),
		onEvent: dependencies.onExecutorEvent,
	});

	if (result.plan.operations.length === 0) {
		write(
			pinned
				? `Agents Pack is already pinned to ${state.lock.pack.version}.\n`
				: "Agents Pack is already unpinned.\n",
		);
		return;
	}

	write(
		pinned
			? `Pinned Agents Pack to ${state.lock.pack.version}.\n`
			: "Unpinned Agents Pack. Forward updates are allowed.\n",
	);
}

export async function runRollback(
	args: readonly string[],
	dependencies: VersionCommandDependencies = {},
): Promise<void> {
	const options = parseRollbackArguments(args);
	const context = createContext(dependencies);
	const state = await detectInstalledScope(context);

	if (state.status !== "installed") {
		throw new AgentsPackError(
			"NOT_INITIALIZED",
			"Agents Pack is not initialized.",
		);
	}

	const write =
		dependencies.write ?? ((text: string) => process.stdout.write(text));
	const interactive = dependencies.interactive ?? Boolean(process.stdin.isTTY);
	const cached = await listCachedPacks(context.userHome, state.lock.pack.id);
	const pack = selectRollbackPack(
		cached,
		state.lock.pack.version,
		options.version,
	);
	const createPlan = () => planRollback({ pack, context });
	const apply = (approvedPlan?: ChangePlan) =>
		runMutation({
			paths: state.paths,
			command: "rollback",
			createPlan: async () => {
				const currentPlan = await createPlan();

				if (
					approvedPlan !== undefined &&
					planSignature(currentPlan) !== planSignature(approvedPlan)
				) {
					throw new AgentsPackError(
						"DRIFT",
						"The rollback plan changed after approval. Review and rerun it.",
					);
				}

				return currentPlan;
			},
			onEvent: dependencies.onExecutorEvent,
		});
	const approvedPlan = await createPlan();
	write(
		[
			`Rollback: ${state.lock.pack.version} -> ${pack.manifest.version}`,
			"",
			"Target release notes:",
			pack.releaseNotes ?? "No release notes were supplied for this version.",
			"",
		].join("\n"),
	);
	write(formatChangePlan(approvedPlan));

	if (options.dryRun) {
		write("Dry run only. No files changed.\n");
		return;
	}

	if (!options.yes) {
		if (!interactive) {
			throw new AgentsPackError(
				"USAGE",
				"Non-interactive rollback requires --yes to apply changes.",
				{ exitCode: 2 },
			);
		}

		if (!(await (dependencies.confirm ?? confirmApply)())) {
			write("Cancelled. No files changed.\n");
			return;
		}
	}

	await apply(approvedPlan);
	write(
		`Rolled back ${state.lock.pack.id} to ${pack.manifest.version} and pinned it.\n`,
	);
}

function selectRollbackPack(
	packs: readonly LoadedPack[],
	currentVersion: string,
	requestedVersion?: string,
): LoadedPack {
	const byVersion = new Map<string, LoadedPack>();

	for (const pack of packs) {
		const existing = byVersion.get(pack.manifest.version);

		if (existing !== undefined && existing.sha256 !== pack.sha256) {
			throw new AgentsPackError(
				"INVALID_PACK",
				`Cached pack version ${pack.manifest.version} has more than one immutable payload.`,
			);
		}

		byVersion.set(pack.manifest.version, pack);
	}

	if (requestedVersion !== undefined) {
		const requested = byVersion.get(requestedVersion);

		if (requested === undefined) {
			throw new AgentsPackError(
				"USAGE",
				`Pack version ${requestedVersion} is not available in the local cache.`,
				{ exitCode: 2 },
			);
		}

		if (compareVersions(requestedVersion, currentVersion) >= 0) {
			throw new AgentsPackError(
				"USAGE",
				`Rollback requires a version older than ${currentVersion}.`,
				{ exitCode: 2 },
			);
		}

		return requested;
	}

	const candidates = [...byVersion.values()]
		.filter(
			(pack) => compareVersions(pack.manifest.version, currentVersion) < 0,
		)
		.sort((left, right) =>
			compareVersions(right.manifest.version, left.manifest.version),
		);
	const selected = candidates[0];

	if (selected === undefined) {
		throw new AgentsPackError(
			"USAGE",
			`No cached version older than ${currentVersion} is available.`,
			{ exitCode: 2 },
		);
	}

	return selected;
}

function createContext(dependencies: VersionCommandDependencies): PathContext {
	return {
		cwd: resolve(dependencies.cwd ?? process.cwd()),
		userHome: resolve(dependencies.userHome ?? homedir()),
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
