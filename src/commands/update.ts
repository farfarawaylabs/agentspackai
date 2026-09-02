import { homedir } from "node:os";
import { resolve } from "node:path";
import { parseUpdateArguments } from "../cli/arguments.ts";
import { confirmApply, promptForNewComponents } from "../cli/prompts.ts";
import { cachePack, loadCachedPack } from "../core/base-cache.ts";
import { AgentsPackError } from "../core/errors.ts";
import { formatChangePlan } from "../core/format-plan.ts";
import { detectInstalledScope } from "../core/inspect.ts";
import { loadPack } from "../core/pack.ts";
import { planUpdate, planUpdateCheck } from "../core/plan.ts";
import { loadOfficialPack } from "../core/registry.ts";
import { findNewComponents } from "../core/selection.ts";
import type {
	ChangePlan,
	ExecutorEvent,
	LockFile,
	PackComponent,
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
	promptForNewComponents?: (
		components: readonly PackComponent[],
	) => Promise<string[]>;
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
		if (compareVersions(pack.manifest.version, state.lock.pack.version) > 0) {
			const additions = await discoverNewComponents(
				state.config,
				state.lock,
				pack,
				userHome,
				write,
			);
			write(formatNewComponents(additions));
		}
		return;
	}

	let addComponents = parsed.addComponents ?? [];
	// Validate the candidate and current installation before offering additions.
	let approvedPlan = await planUpdate({ pack, context, addComponents });
	write(formatCandidateRelease(state.lock, pack));
	if (compareVersions(pack.manifest.version, state.lock.pack.version) > 0) {
		const additions = await discoverNewComponents(
			state.config,
			state.lock,
			pack,
			userHome,
			write,
		);
		write(formatNewComponents(additions));
		const selectable = additions.filter(
			(component) => component.selection !== "required",
		);
		if (
			interactive &&
			!parsed.yes &&
			!parsed.dryRun &&
			parsed.addComponents === undefined &&
			selectable.length > 0
		) {
			addComponents = await (
				dependencies.promptForNewComponents ?? promptForNewComponents
			)(selectable);
			const allowed = new Set(selectable.map((component) => component.id));
			if (
				new Set(addComponents).size !== addComponents.length ||
				addComponents.some((id) => !allowed.has(id))
			) {
				throw new AgentsPackError(
					"USAGE",
					"Select only new components offered by this update.",
					{ exitCode: 2 },
				);
			}
			approvedPlan = await planUpdate({ pack, context, addComponents });
		}
	}
	write(formatChangePlan(approvedPlan));

	const apply = (approvedPlan: ChangePlan) =>
		runMutation({
			paths: state.paths,
			command: "update",
			createPlan: async () => {
				const currentPlan = await planUpdate({ pack, context, addComponents });

				if (planSignature(currentPlan) !== planSignature(approvedPlan)) {
					throw new AgentsPackError(
						"DRIFT",
						"The update plan changed after approval. Review and rerun it.",
					);
				}

				return currentPlan;
			},
			onEvent: dependencies.onExecutorEvent,
		});

	if (parsed.dryRun) {
		write("Dry run only. No files changed.\n");
		return;
	}

	if (!parsed.yes && approvedPlan.operations.length === 0) {
		await cachePack(userHome, pack);
		write("Agents Pack is already at this version. No changes applied.\n");
		return;
	}

	if (!parsed.yes && !interactive) {
		throw new AgentsPackError(
			"USAGE",
			"Non-interactive update requires --yes to apply changes.",
			{ exitCode: 2 },
		);
	}

	if (!parsed.yes && !(await (dependencies.confirm ?? confirmApply)())) {
		write("Cancelled. No files changed.\n");
		return;
	}

	await cachePack(userHome, pack);
	const result = await apply(approvedPlan);
	writeMutationResult(result, pack.manifest.id, pack.manifest.version, write);
}

async function discoverNewComponents(
	config: ScopeConfig,
	lock: LockFile,
	pack: Awaited<ReturnType<typeof loadPack>>,
	userHome: string,
	write: (text: string) => void,
): Promise<PackComponent[]> {
	try {
		const previous = await loadCachedPack(userHome, lock.pack.sha256);
		return findNewComponents(previous.manifest, pack.manifest, config.targets);
	} catch (error) {
		if (
			!(error instanceof AgentsPackError) ||
			!["MALFORMED_STATE", "INVALID_PACK"].includes(error.code)
		)
			throw error;
		// Updates can repair an installation whose cached Base was lost. Do not
		// turn optional discovery into a new prerequisite for that recovery path.
		write(
			"New-component discovery unavailable: the previous pack cache is missing or invalid. Existing selections and explicit additions are preserved; use agents-pack list --available after updating.\n\n",
		);
		return [];
	}
}

function formatNewComponents(components: readonly PackComponent[]): string {
	if (components.length === 0) return "";
	return [
		"New components in this update:",
		...components.map(
			(component) =>
				`  ${component.id} (${component.kind}; ${component.category}; ${component.selection === "required" ? "required, added automatically" : component.selection}) — ${component.summary}`,
		),
		"",
		"Interactive update lets you choose additions. With --yes or --dry-run, use --add <id,id> to select extras explicitly.",
		"",
	].join("\n");
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
