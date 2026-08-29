import { createHash, randomUUID } from "node:crypto";
import {
	chmod,
	lstat,
	mkdir,
	readdir,
	readFile,
	rm,
	unlink,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { AgentsPackError } from "../core/errors.ts";
import type { McpPaths } from "../core/mcp.ts";
import type { McpAgent } from "../core/mcp.ts";
import { atomicWriteFile, syncDirectory } from "./atomic-write.ts";

type SnapshotRole = "state" | "codex" | "claude" | "cursor";
type McpMutationCommand = "mcp-add" | "mcp-remove";

interface McpSnapshot {
	role: SnapshotRole;
	path: string;
	existed: boolean;
	backupFile?: string;
	sha256?: string;
	mode?: number;
}

interface McpJournal {
	schemaVersion: 1;
	id: string;
	command: McpMutationCommand;
	state: "prepared" | "applying" | "committed";
	createdAt: string;
	snapshots: McpSnapshot[];
}

export interface McpTransactionDependencies {
	createId?: () => string;
	now?: () => Date;
}

export async function listPendingMcpTransactions(
	paths: McpPaths,
): Promise<string[]> {
	try {
		return (await readdir(paths.transactionsDirectory, { withFileTypes: true }))
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort();
	} catch (error) {
		if (hasCode(error, "ENOENT")) {
			return [];
		}
		throw error;
	}
}

export async function recoverPendingMcpTransactions(
	paths: McpPaths,
): Promise<string[]> {
	const recovered: string[] = [];

	for (const id of await listPendingMcpTransactions(paths)) {
		const directory = join(paths.transactionsDirectory, id);
		const journal = await readJournal(directory, id, paths);

		if (journal.state !== "committed") {
			await restoreSnapshots(directory, journal.snapshots);
			recovered.push(id);
		}

		await rm(directory, { recursive: true, force: true });
		await syncDirectory(paths.transactionsDirectory);
	}

	return recovered;
}

export async function runMcpTransaction(
	input: {
		paths: McpPaths;
		command: McpMutationCommand;
		agents: readonly McpAgent[];
		mutate: () => Promise<void>;
	},
	dependencies: McpTransactionDependencies = {},
): Promise<void> {
	const id = `tx-${(dependencies.createId ?? randomUUID)()}`;
	const directory = join(input.paths.transactionsDirectory, id);
	const journalPath = join(directory, "journal.json");
	let journal: McpJournal | undefined;

	await mkdir(directory, { recursive: true, mode: 0o700 });

	try {
		const snapshots = await createSnapshots(
			directory,
			input.paths,
			input.agents,
		);
		journal = {
			schemaVersion: 1,
			id,
			command: input.command,
			state: "prepared",
			createdAt: (dependencies.now ?? (() => new Date()))().toISOString(),
			snapshots,
		};
		await writeJournal(journalPath, journal);
		journal = { ...journal, state: "applying" };
		await writeJournal(journalPath, journal);
		await input.mutate();
		journal = { ...journal, state: "committed" };
		await writeJournal(journalPath, journal);
		await rm(directory, { recursive: true, force: true });
		await syncDirectory(input.paths.transactionsDirectory);
	} catch (error) {
		if (journal !== undefined) {
			try {
				await restoreSnapshots(directory, journal.snapshots);
				await rm(directory, { recursive: true, force: true });
				await syncDirectory(input.paths.transactionsDirectory);
			} catch (recoveryError) {
				throw new AgentsPackError(
					"RECOVERY_FAILED",
					`MCP mutation failed and automatic recovery did not complete. Transaction: ${id}`,
					{ cause: recoveryError },
				);
			}
		} else {
			await rm(directory, { recursive: true, force: true }).catch(
				() => undefined,
			);
		}

		throw error;
	}
}

async function createSnapshots(
	directory: string,
	paths: McpPaths,
	agents: readonly McpAgent[],
): Promise<McpSnapshot[]> {
	const targets: { role: SnapshotRole; path: string }[] = [
		{ role: "state", path: paths.statePath },
		...(agents.includes("codex")
			? [{ role: "codex" as const, path: paths.codexConfigPath }]
			: []),
		...(agents.includes("claude")
			? [{ role: "claude" as const, path: paths.claudeConfigPath }]
			: []),
		...(agents.includes("cursor")
			? [{ role: "cursor" as const, path: paths.cursorConfigPath }]
			: []),
	];
	const snapshots: McpSnapshot[] = [];

	for (const target of targets) {
		const info = await lstat(target.path).catch((error: unknown) => {
			if (hasCode(error, "ENOENT")) {
				return undefined;
			}
			throw error;
		});

		if (info === undefined) {
			snapshots.push({ ...target, existed: false });
			continue;
		}

		if (!info.isFile()) {
			throw new AgentsPackError(
				"OWNERSHIP_CONFLICT",
				`MCP configuration path must be a regular file: ${target.path}`,
			);
		}

		const bytes = await readFile(target.path);
		const backupFile = `${target.role}.bak`;
		await atomicWriteFile(join(directory, backupFile), bytes, { mode: 0o600 });
		snapshots.push({
			...target,
			existed: true,
			backupFile,
			sha256: sha256(bytes),
			mode: info.mode & 0o777,
		});
	}

	return snapshots;
}

async function restoreSnapshots(
	directory: string,
	snapshots: readonly McpSnapshot[],
): Promise<void> {
	for (const snapshot of snapshots) {
		if (!snapshot.existed) {
			let removed = false;

			try {
				await unlink(snapshot.path);
				removed = true;
			} catch (error) {
				if (!hasCode(error, "ENOENT")) {
					throw error;
				}
			}

			if (removed) {
				await syncDirectory(dirname(snapshot.path));
			}
			continue;
		}

		if (
			snapshot.backupFile === undefined ||
			snapshot.sha256 === undefined ||
			snapshot.mode === undefined
		) {
			throw new AgentsPackError(
				"RECOVERY_FAILED",
				`MCP transaction has an incomplete snapshot for ${snapshot.role}.`,
			);
		}

		const bytes = await readFile(join(directory, snapshot.backupFile));

		if (sha256(bytes) !== snapshot.sha256) {
			throw new AgentsPackError(
				"RECOVERY_FAILED",
				`MCP transaction backup failed verification for ${snapshot.role}.`,
			);
		}

		await mkdir(dirname(snapshot.path), { recursive: true, mode: 0o700 });
		await atomicWriteFile(snapshot.path, bytes, { mode: snapshot.mode });
		await chmod(snapshot.path, snapshot.mode);
	}
}

async function writeJournal(path: string, journal: McpJournal): Promise<void> {
	await atomicWriteFile(
		path,
		Buffer.from(`${JSON.stringify(journal, null, 2)}\n`),
		{ mode: 0o600 },
	);
}

async function readJournal(
	directory: string,
	id: string,
	paths: McpPaths,
): Promise<McpJournal> {
	let value: unknown;

	try {
		value = JSON.parse(await readFile(join(directory, "journal.json"), "utf8"));
	} catch (cause) {
		throw malformedJournal(id, cause);
	}

	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw malformedJournal(id);
	}

	const record = value as Record<string, unknown>;

	if (
		record.schemaVersion !== 1 ||
		record.id !== id ||
		(record.command !== "mcp-add" && record.command !== "mcp-remove") ||
		(record.state !== "prepared" &&
			record.state !== "applying" &&
			record.state !== "committed") ||
		typeof record.createdAt !== "string" ||
		!Array.isArray(record.snapshots)
	) {
		throw malformedJournal(id);
	}

	const expectedPaths: Record<SnapshotRole, string> = {
		state: paths.statePath,
		codex: paths.codexConfigPath,
		claude: paths.claudeConfigPath,
		cursor: paths.cursorConfigPath,
	};
	const snapshots = record.snapshots.map((value) =>
		parseSnapshot(value, expectedPaths, id),
	);

	if (
		snapshots.length === 0 ||
		!snapshots.some((snapshot) => snapshot.role === "state") ||
		new Set(snapshots.map((snapshot) => snapshot.role)).size !==
			snapshots.length
	) {
		throw malformedJournal(id);
	}

	return {
		schemaVersion: 1,
		id,
		command: record.command,
		state: record.state,
		createdAt: record.createdAt,
		snapshots,
	};
}

function parseSnapshot(
	value: unknown,
	expectedPaths: Record<SnapshotRole, string>,
	id: string,
): McpSnapshot {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw malformedJournal(id);
	}

	const record = value as Record<string, unknown>;

	if (
		!isSnapshotRole(record.role) ||
		typeof record.path !== "string" ||
		record.path !== expectedPaths[record.role] ||
		typeof record.existed !== "boolean"
	) {
		throw malformedJournal(id);
	}

	if (!record.existed) {
		return { role: record.role, path: record.path, existed: false };
	}

	if (
		record.backupFile !== `${record.role}.bak` ||
		typeof record.sha256 !== "string" ||
		!/^[a-f0-9]{64}$/.test(record.sha256) ||
		typeof record.mode !== "number" ||
		!Number.isInteger(record.mode)
	) {
		throw malformedJournal(id);
	}

	return {
		role: record.role,
		path: record.path,
		existed: true,
		backupFile: record.backupFile,
		sha256: record.sha256,
		mode: record.mode,
	};
}

function malformedJournal(id: string, cause?: unknown): AgentsPackError {
	return new AgentsPackError(
		"RECOVERY_FAILED",
		`MCP transaction journal is malformed: ${id}`,
		{ cause },
	);
}

function isSnapshotRole(value: unknown): value is SnapshotRole {
	return (
		value === "state" ||
		value === "codex" ||
		value === "claude" ||
		value === "cursor"
	);
}

function sha256(bytes: Uint8Array): string {
	return createHash("sha256").update(bytes).digest("hex");
}

function hasCode(error: unknown, code: string): boolean {
	return (
		error instanceof Error &&
		"code" in error &&
		(error as NodeJS.ErrnoException).code === code
	);
}
