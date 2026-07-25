import type { Dirent } from "node:fs";
import { lstat, readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { detectInstalledScope, inspectLockedOutputs } from "./inspect.ts";
import { resolveScopePaths } from "./paths.ts";
import type {
	AgentTarget,
	InspectedOutput,
	PathContext,
	Scope,
} from "./types.ts";

export interface ScopeActivity {
	scope: Scope;
	kind: "operation-lock" | "transaction";
	id: string;
	state?: string;
}

export type StatusReport =
	| {
			kind: "installed";
			scope: Scope;
			packId: string;
			packVersion: string;
			targets: AgentTarget[];
			outputs: InspectedOutput[];
			warnings: string[];
	  }
	| {
			kind: "recovery-required";
			activities: ScopeActivity[];
	  };

export async function getStatusReport(
	context: PathContext,
): Promise<StatusReport> {
	const [repositoryPaths, globalPaths] = await Promise.all([
		resolveScopePaths("repository", context),
		resolveScopePaths("global", context),
	]);
	const activities = (
		await Promise.all([
			inspectScopeActivity(repositoryPaths),
			inspectScopeActivity(globalPaths),
		])
	)
		.flat()
		.sort(compareActivities);

	if (activities.length > 0) {
		return { kind: "recovery-required", activities };
	}

	const state = await detectInstalledScope(context);

	if (state.status !== "installed") {
		throw new Error("Installed scope detection returned no installation.");
	}

	return {
		kind: "installed",
		scope: state.config.scope,
		packId: state.config.packId,
		packVersion: state.config.packVersion,
		targets: state.config.targets,
		outputs: await inspectLockedOutputs(
			state.paths.root,
			state.config.scope,
			state.lock,
		),
		warnings: statusWarnings(state.config.targets),
	};
}

export function formatStatusReport(report: StatusReport): string {
	if (report.kind === "recovery-required") {
		const lines = [
			"Agents Pack",
			"",
			"Recovery required.",
			"A previous or active mutation was detected. Status did not modify it.",
			"",
			"Activity:",
		];

		for (const activity of report.activities) {
			const detail =
				activity.kind === "transaction"
					? `${activity.id} (${activity.state ?? "unknown"})`
					: activity.id;
			lines.push(`  ${activity.scope}  ${activity.kind}  ${detail}`);
		}

		lines.push(
			"",
			"Run the interrupted mutating command again to recover safely.",
		);
		return `${lines.join("\n")}\n`;
	}

	const lines = [
		"Agents Pack",
		"",
		`Scope: ${report.scope}`,
		`Pack: ${report.packId}@${report.packVersion}`,
		`Agents: ${report.targets.join(", ")}`,
		"",
		"Managed:",
	];

	for (const inspection of report.outputs) {
		const path =
			inspection.output.kind === "managed-block"
				? `${inspection.output.path}#${inspection.output.blockId}`
				: inspection.output.path;
		lines.push(`  ${inspection.status.padEnd(9)} ${path}`);
	}

	if (report.warnings.length > 0) {
		lines.push("", "Warnings:");

		for (const warning of report.warnings) {
			lines.push(`  - ${warning}`);
		}
	}

	return `${lines.join("\n")}\n`;
}

async function inspectScopeActivity(
	paths: Awaited<ReturnType<typeof resolveScopePaths>>,
): Promise<ScopeActivity[]> {
	const activities: ScopeActivity[] = [];

	if (await exists(paths.operationLockPath)) {
		activities.push({
			scope: paths.scope,
			kind: "operation-lock",
			id: await readLockDescription(paths.operationLockPath),
		});
	}

	let entries: Dirent[];

	try {
		entries = await readdir(paths.transactionsDirectory, {
			withFileTypes: true,
		});
	} catch (error) {
		if (isMissing(error)) {
			return activities;
		}

		throw error;
	}

	for (const entry of entries) {
		if (!entry.isDirectory()) {
			activities.push({
				scope: paths.scope,
				kind: "transaction",
				id: entry.name,
				state: "malformed",
			});
			continue;
		}

		const journalPath = join(
			paths.transactionsDirectory,
			entry.name,
			"journal.json",
		);
		activities.push({
			scope: paths.scope,
			kind: "transaction",
			id: entry.name,
			state: await readJournalState(journalPath),
		});
	}

	return activities;
}

async function readLockDescription(path: string): Promise<string> {
	try {
		const record = JSON.parse(await readFile(path, "utf8")) as {
			command?: unknown;
			pid?: unknown;
		};

		if (typeof record.command === "string" && typeof record.pid === "number") {
			return `${record.command} pid=${record.pid}`;
		}
	} catch {
		// Status reports malformed coordination state without modifying it.
	}

	return basename(path);
}

async function readJournalState(path: string): Promise<string> {
	try {
		const record = JSON.parse(await readFile(path, "utf8")) as {
			state?: unknown;
		};
		return typeof record.state === "string" ? record.state : "malformed";
	} catch {
		return "malformed";
	}
}

function statusWarnings(targets: readonly AgentTarget[]): string[] {
	if (
		targets.includes("cursor") &&
		targets.includes("claude") &&
		targets.includes("codex")
	) {
		return [
			"Cursor may discover skills through both Claude and Codex compatibility roots.",
		];
	}

	return [];
}

async function exists(path: string): Promise<boolean> {
	try {
		await lstat(path);
		return true;
	} catch (error) {
		if (isMissing(error)) {
			return false;
		}

		throw error;
	}
}

function compareActivities(left: ScopeActivity, right: ScopeActivity): number {
	const leftKey = `${left.scope}:${left.kind}:${left.id}`;
	const rightKey = `${right.scope}:${right.kind}:${right.id}`;
	return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function isMissing(error: unknown): boolean {
	return (
		error instanceof Error &&
		"code" in error &&
		(error as NodeJS.ErrnoException).code === "ENOENT"
	);
}
