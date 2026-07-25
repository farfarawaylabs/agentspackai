import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { open, readFile, rename, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { AgentsPackError } from "../core/errors.ts";
import type { ChangePlan, ScopePaths } from "../core/types.ts";
import { syncDirectory } from "./atomic-write.ts";

interface LockRecord {
	schemaVersion: 1;
	id: string;
	pid: number;
	hostname: string;
	scope: ScopePaths["scope"];
	command: ChangePlan["command"];
	startedAt: string;
}

export interface AcquiredOperationLock {
	staleLockRecovered: boolean;
	release(): Promise<void>;
}

export interface OperationLockDependencies {
	createId?: () => string;
	now?: () => Date;
	isProcessAlive?: (pid: number) => boolean;
}

export async function acquireOperationLock(
	paths: ScopePaths,
	command: ChangePlan["command"],
	dependencies: OperationLockDependencies = {},
): Promise<AcquiredOperationLock> {
	const createId = dependencies.createId ?? randomUUID;
	const now = dependencies.now ?? (() => new Date());
	const isProcessAlive = dependencies.isProcessAlive ?? defaultIsProcessAlive;
	const id = createId();
	let staleLockRecovered = false;

	for (let attempt = 0; attempt < 4; attempt += 1) {
		const record: LockRecord = {
			schemaVersion: 1,
			id,
			pid: process.pid,
			hostname: hostname(),
			scope: paths.scope,
			command,
			startedAt: now().toISOString(),
		};

		try {
			const handle = await open(paths.operationLockPath, "wx", 0o600);

			try {
				await handle.writeFile(`${JSON.stringify(record, null, 2)}\n`);
				await handle.sync();
			} catch (error) {
				await handle.close().catch(() => undefined);
				await unlink(paths.operationLockPath).catch(() => undefined);
				throw error;
			}

			await handle.close();
			await syncDirectory(paths.root);

			return {
				staleLockRecovered,
				release: () => releaseOperationLock(paths.operationLockPath, id),
			};
		} catch (error) {
			if (!isAlreadyExists(error)) {
				throw error;
			}
		}

		const existing = await readLockRecord(paths.operationLockPath);

		if (existing !== undefined && isProcessAlive(existing.pid)) {
			throw new AgentsPackError(
				"CONCURRENT_OPERATION",
				`Another Agents Pack ${existing.command} operation is running with process ${existing.pid}.`,
			);
		}

		const quarantinePath = `${paths.operationLockPath}.stale-${createId()}`;

		try {
			await rename(paths.operationLockPath, quarantinePath);
			await unlink(quarantinePath);
			staleLockRecovered = true;
			await syncDirectory(paths.root);
		} catch (error) {
			if (isMissing(error)) {
				continue;
			}

			throw error;
		}
	}

	throw new AgentsPackError(
		"CONCURRENT_OPERATION",
		"Unable to acquire the Agents Pack operation lock after resolving contention.",
	);
}

async function releaseOperationLock(path: string, id: string): Promise<void> {
	const current = await readLockRecord(path);

	if (current === undefined) {
		return;
	}

	if (current.id !== id) {
		throw new AgentsPackError(
			"CONCURRENT_OPERATION",
			"Agents Pack operation lock ownership changed before release.",
		);
	}

	await unlink(path);
	await syncDirectory(dirname(path));
}

async function readLockRecord(path: string): Promise<LockRecord | undefined> {
	let source: string;

	try {
		source = await readFile(path, "utf8");
	} catch (error) {
		if (isMissing(error)) {
			return undefined;
		}

		throw error;
	}

	try {
		const value = JSON.parse(source) as Partial<LockRecord>;

		if (
			value.schemaVersion !== 1 ||
			typeof value.id !== "string" ||
			typeof value.pid !== "number" ||
			!Number.isInteger(value.pid) ||
			value.pid <= 0 ||
			(value.command !== "init" &&
				value.command !== "update" &&
				value.command !== "eject") ||
			(value.scope !== "global" && value.scope !== "repository")
		) {
			return undefined;
		}

		return value as LockRecord;
	} catch {
		return undefined;
	}
}

function defaultIsProcessAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return (
			error instanceof Error &&
			"code" in error &&
			(error as NodeJS.ErrnoException).code === "EPERM"
		);
	}
}

function isAlreadyExists(error: unknown): boolean {
	return hasCode(error, "EEXIST");
}

function isMissing(error: unknown): boolean {
	return hasCode(error, "ENOENT");
}

function hasCode(error: unknown, code: string): boolean {
	return (
		error instanceof Error &&
		"code" in error &&
		(error as NodeJS.ErrnoException).code === code
	);
}
