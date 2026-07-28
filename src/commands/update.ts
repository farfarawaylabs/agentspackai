import { homedir } from "node:os";
import { resolve } from "node:path";
import { parseUpdateArguments } from "../cli/arguments.ts";
import { confirmApply } from "../cli/prompts.ts";
import { cachePack } from "../core/base-cache.ts";
import { AgentsPackError } from "../core/errors.ts";
import { formatChangePlan } from "../core/format-plan.ts";
import { detectInstalledScope } from "../core/inspect.ts";
import { loadPack } from "../core/pack.ts";
import { planUpdate, planUpdateCheck } from "../core/plan.ts";
import { loadOfficialPack } from "../core/registry.ts";
import type {
	ChangePlan,
	ExecutorEvent,
	LockFile,
	PathContext,
	ScopeConfig,
} from "../core/types.ts";
import { compareVersions } from "../core/versions.ts";
import { runMutation } from "../filesystem/transaction.ts";

export interface UpdateCommandDependencies {
	cwd?: string;
	userHome?: string;
	interactive?: boolean;
	write?: (text: string) => void;
	confirm?: () => Promise<boolean>;
	onExecutorEvent?: (event: ExecutorEvent) => void | Promise<void>;
	loadOfficialPack?: (
		packId: string,
	) => Promise<Awaited<ReturnType<typeof loadPack>>>;
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
	const parsed = parseUpdateArguments(args);
	const context: PathContext = { cwd, userHome };
	const state = await detectInstalledScope(context);

	if (state.status !== "installed") {
		throw new AgentsPackError(
			"NOT_INITIALIZED",
			"Agents Pack is not initialized.",
		);
	}

	const pack =
		parsed.packPath === undefined
			? await resolveInstalledOfficialPack(state.config, dependencies)
			: await loadPack(resolve(cwd, parsed.packPath));

	if (parsed.check) {
		const report = formatUpdateCheck(state.config, state.lock, pack);

		if (compareVersions(pack.manifest.version, state.lock.pack.version) >= 0) {
			await planUpdateCheck({ pack, context });
		}

		write(report);
		return;
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
		write(formatCandidateRelease(state.lock, pack));
		write(formatChangePlan(approvedPlan));
		await cachePack(userHome, pack);
		const result = await apply(approvedPlan);
		writeMutationResult(result, pack.manifest.id, pack.manifest.version, write);
		return;
	}

	const approvedPlan = await planUpdate({ pack, context });
	write(formatCandidateRelease(state.lock, pack));
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

async function resolveInstalledOfficialPack(
	config: ScopeConfig,
	dependencies: UpdateCommandDependencies,
): Promise<Awaited<ReturnType<typeof loadPack>>> {
	if (config.pack.source !== "official") {
		throw new AgentsPackError(
			"USAGE",
			"This installation uses a local pack. Provide --pack with the next local pack version.",
			{ exitCode: 2 },
		);
	}

	return (dependencies.loadOfficialPack ?? loadOfficialPack)(config.pack.id);
}

function formatCandidateRelease(
	lock: LockFile,
	pack: Awaited<ReturnType<typeof loadPack>>,
): string {
	return [
		`Update: ${lock.pack.version} -> ${pack.manifest.version}`,
		"",
		"Release notes:",
		pack.releaseNotes ?? "No release notes were supplied for this version.",
		"",
	].join("\n");
}

function formatUpdateCheck(
	config: ScopeConfig,
	lock: LockFile,
	pack: Awaited<ReturnType<typeof loadPack>>,
): string {
	if (pack.manifest.id !== config.pack.id) {
		throw new AgentsPackError(
			"INVALID_PACK",
			`Installed pack ${config.pack.id} cannot be checked against ${pack.manifest.id}.`,
		);
	}

	if (
		pack.manifest.version === lock.pack.version &&
		pack.sha256 !== lock.pack.sha256
	) {
		throw new AgentsPackError(
			"INVALID_PACK",
			`Pack version ${lock.pack.version} has different content; published pack versions are immutable.`,
		);
	}

	const comparison = compareVersions(pack.manifest.version, lock.pack.version);
	let status: string;

	if (comparison === 0) {
		status = "Already current.";
	} else if (comparison < 0) {
		status =
			"Candidate is older; use agents-pack rollback for cached versions.";
	} else if (config.pack.pinnedVersion !== undefined) {
		status = `Update available, but this installation is pinned to ${config.pack.pinnedVersion}.`;
	} else {
		status = "Update available.";
	}

	const releaseNotes =
		pack.releaseNotes ?? "No release notes were supplied for this version.";

	return [
		"Agents Pack update check",
		"",
		`Current: ${lock.pack.id}@${lock.pack.version}`,
		`Candidate: ${pack.manifest.id}@${pack.manifest.version}`,
		`Pin: ${config.pack.pinnedVersion ?? "none"}`,
		`Status: ${status}`,
		"",
		"Release notes:",
		releaseNotes,
		"",
	].join("\n");
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
