import { randomUUID } from "node:crypto";
import type { Dirent } from "node:fs";
import {
	lstat,
	mkdir,
	readFile,
	readdir,
	rm,
	rmdir,
	unlink,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { AgentsPackError } from "../core/errors.ts";
import { hashBytes } from "../core/hash.ts";
import {
	isPathInside,
	resolveContainedPath,
	toPortablePath,
	validatePortableRelativePath,
} from "../core/paths.ts";
import type {
	ChangeOperation,
	ChangePlan,
	ExecutorEvent,
	MutationResult,
	ScopePaths,
	TransactionJournal,
	TransactionSnapshot,
} from "../core/types.ts";
import {
	findManagedBlock,
	insertManagedBlock,
	removeManagedBlock,
	replaceManagedBlock,
} from "./managed-block.ts";
import { atomicWriteFile, syncDirectory } from "./atomic-write.ts";
import {
	acquireOperationLock,
	type OperationLockDependencies,
} from "./operation-lock.ts";

const TRANSACTION_DIRECTORY = /^tx-[A-Za-z0-9-]+$/;
const SNAPSHOT_BACKUP = /^snapshots\/[0-9]{4}\.bin$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const encoder = new TextEncoder();

export interface RunMutationOptions {
	paths: ScopePaths;
	command: ChangePlan["command"];
	createPlan: () => ChangePlan | Promise<ChangePlan>;
	onEvent?: (event: ExecutorEvent) => void | Promise<void>;
	lockDependencies?: OperationLockDependencies;
	createTransactionId?: () => string;
	now?: () => Date;
}

interface PreparedTransaction {
	directory: string;
	journalPath: string;
	journal: TransactionJournal;
	snapshotsByPath: Map<string, TransactionSnapshot>;
}

interface AppliedOperation {
	operation: ChangeOperation;
	expectedBytes?: Uint8Array;
	expectAbsent?: boolean;
}

export async function runMutation(
	options: RunMutationOptions,
): Promise<MutationResult> {
	const operationLock = await acquireOperationLock(
		options.paths,
		options.command,
		options.lockDependencies,
	);

	try {
		const recoveredTransactions = await recoverTransactions(options.paths);
		const plan = await options.createPlan();
		assertPlanMatchesInvocation(plan, options);

		if (plan.operations.length === 0) {
			return {
				plan,
				appliedOperations: 0,
				recoveredTransactions,
				staleLockRecovered: operationLock.staleLockRecovered,
			};
		}

		const transaction = await prepareTransaction(plan, options);
		let committed = false;

		try {
			await updateJournalState(transaction, "applying");
			await options.onEvent?.({ point: "before-first-write" });
			const appliedOperations = await applyPlan(plan, transaction, options);
			await updateJournalState(transaction, "committed");
			committed = true;
			await options.onEvent?.({ point: "after-commit" });
			await cleanupCommittedTransaction(transaction, options.paths);

			return {
				plan,
				appliedOperations,
				recoveredTransactions,
				staleLockRecovered: operationLock.staleLockRecovered,
			};
		} catch (cause) {
			if (committed) {
				throw new AgentsPackError(
					"EXECUTION_FAILED",
					"The transaction committed, but cleanup did not finish. It will be cleaned on the next mutation.",
					{ cause },
				);
			}

			try {
				await rollbackTransaction(transaction, options.paths);
			} catch (rollbackCause) {
				throw new AgentsPackError(
					"RECOVERY_FAILED",
					"Agents Pack could not restore the failed transaction.",
					{ cause: new AggregateError([cause, rollbackCause]) },
				);
			}

			throw new AgentsPackError(
				"EXECUTION_FAILED",
				"Agents Pack restored the previous filesystem state after the transaction failed.",
				{ cause },
			);
		}
	} finally {
		await operationLock.release();
	}
}

async function prepareTransaction(
	plan: ChangePlan,
	options: RunMutationOptions,
): Promise<PreparedTransaction> {
	const id = `tx-${(options.createTransactionId ?? randomUUID)()}`;
	const directory = join(options.paths.transactionsDirectory, id);
	const journalPath = join(directory, "journal.json");
	const missingDirectories = await collectMissingDirectories(
		options.paths,
		plan.operations,
	);

	try {
		await mkdir(join(directory, "snapshots"), { recursive: true });
		const snapshots = await createSnapshots(
			options.paths,
			directory,
			plan.operations,
		);
		const journal: TransactionJournal = {
			schemaVersion: 1,
			id,
			scope: plan.scope,
			command: plan.command,
			state: "prepared",
			createdAt: (options.now ?? (() => new Date()))().toISOString(),
			snapshots,
			createdDirectories: missingDirectories,
			pendingEmptyDirectories: plan.operations
				.filter((operation) => operation.kind === "remove-empty-directory")
				.map((operation) => operation.path),
		};
		await writeJournal(journalPath, journal);

		return {
			directory,
			journalPath,
			journal,
			snapshotsByPath: new Map(
				snapshots.map((snapshot) => [snapshot.path, snapshot]),
			),
		};
	} catch (error) {
		await rm(directory, { recursive: true, force: true }).catch(
			() => undefined,
		);
		await removeEmptyDirectories(options.paths.root, missingDirectories).catch(
			() => undefined,
		);
		throw error;
	}
}

async function createSnapshots(
	paths: ScopePaths,
	transactionDirectory: string,
	operations: readonly ChangeOperation[],
): Promise<TransactionSnapshot[]> {
	const fileOperations = operations.filter(
		(operation) => operation.kind !== "remove-empty-directory",
	);
	const seenPaths = new Set<string>();
	const snapshots: TransactionSnapshot[] = [];

	for (const [index, operation] of fileOperations.entries()) {
		assertManagedTransactionPath(operation.path, paths.scope, operation.kind);

		if (seenPaths.has(operation.path)) {
			throw new AgentsPackError(
				"EXECUTION_FAILED",
				`A transaction cannot mutate the same path twice: ${operation.path}`,
			);
		}

		seenPaths.add(operation.path);
		const absolutePath = await resolveContainedPath(
			paths.root,
			operation.path,
			{
				label: `Transaction output ${operation.path}`,
				rejectFinalSymlink: true,
			},
		);
		const info = await lstatOrUndefined(absolutePath);
		assertOperationPrecondition(operation, info);

		if (info === undefined) {
			snapshots.push({ path: operation.path, existed: false });
			continue;
		}

		const bytes = new Uint8Array(await readFile(absolutePath));
		const backupPath = `snapshots/${index.toString().padStart(4, "0")}.bin`;
		const absoluteBackupPath = join(transactionDirectory, backupPath);
		await atomicWriteFile(absoluteBackupPath, bytes, {
			mode: 0o600,
		});
		snapshots.push({
			path: operation.path,
			existed: true,
			backupPath,
			sha256: hashBytes(bytes),
			mode: Number(info.mode) & 0o777,
		});
	}

	return snapshots;
}

function assertOperationPrecondition(
	operation: ChangeOperation,
	info: Awaited<ReturnType<typeof lstat>> | undefined,
): void {
	if (info !== undefined && !info.isFile()) {
		throw new AgentsPackError(
			"OWNERSHIP_CONFLICT",
			`Transaction destination is not a regular file: ${operation.path}`,
		);
	}

	if (operation.kind === "create-file" && info !== undefined) {
		throw new AgentsPackError(
			"OWNERSHIP_CONFLICT",
			`A file appeared at a planned create destination: ${operation.path}`,
		);
	}

	if (
		(operation.kind === "replace-file" ||
			operation.kind === "remove-file" ||
			operation.kind === "replace-block" ||
			operation.kind === "remove-block") &&
		info === undefined
	) {
		throw new AgentsPackError(
			"DRIFT",
			`A planned transaction input is missing: ${operation.path}`,
		);
	}
}

async function applyPlan(
	plan: ChangePlan,
	transaction: PreparedTransaction,
	options: RunMutationOptions,
): Promise<number> {
	const fileOperations = plan.operations.filter(
		(operation) => operation.kind !== "remove-empty-directory",
	);
	const contentOperations = fileOperations.filter(
		(operation) => !isStateOperation(operation),
	);
	const stateOperations = fileOperations.filter(isStateOperation);
	const appliedContent: AppliedOperation[] = [];
	let operationIndex = 0;

	for (const operation of contentOperations) {
		const applied = await applyOperation(
			options.paths,
			operation,
			transaction,
			options,
			operationIndex,
		);
		await validateAppliedOperation(options.paths, applied);
		appliedContent.push(applied);
		await options.onEvent?.({
			point: "after-operation",
			operation,
			operationIndex,
		});
		operationIndex += 1;
	}

	for (const applied of appliedContent) {
		await validateAppliedOperation(options.paths, applied);
	}

	if (stateOperations.length > 0) {
		await options.onEvent?.({ point: "before-state-write" });
	}

	for (const operation of stateOperations) {
		const applied = await applyOperation(
			options.paths,
			operation,
			transaction,
			options,
			operationIndex,
		);
		await validateAppliedOperation(options.paths, applied);
		await options.onEvent?.({
			point: "after-operation",
			operation,
			operationIndex,
		});
		operationIndex += 1;
	}

	return (
		fileOperations.length + transaction.journal.pendingEmptyDirectories.length
	);
}

async function applyOperation(
	paths: ScopePaths,
	operation: Exclude<ChangeOperation, { kind: "remove-empty-directory" }>,
	transaction: PreparedTransaction,
	options: RunMutationOptions,
	operationIndex: number,
): Promise<AppliedOperation> {
	const absolutePath = await resolveContainedPath(paths.root, operation.path, {
		label: `Transaction output ${operation.path}`,
		rejectFinalSymlink: true,
	});
	const snapshot = transaction.snapshotsByPath.get(operation.path);

	if (snapshot === undefined) {
		throw new AgentsPackError(
			"EXECUTION_FAILED",
			`Transaction snapshot is missing: ${operation.path}`,
		);
	}

	switch (operation.kind) {
		case "create-file":
		case "replace-file":
			await mkdir(dirname(absolutePath), { recursive: true });
			await atomicWriteFile(absolutePath, operation.bytes, {
				mode: snapshot.mode,
				beforeRename: () =>
					options.onEvent?.({
						point: "before-atomic-rename",
						operation,
						operationIndex,
					}),
			});
			return { operation, expectedBytes: operation.bytes };
		case "remove-file":
			await unlink(absolutePath);
			await syncDirectory(dirname(absolutePath));
			return { operation, expectAbsent: true };
		case "insert-block": {
			const current = await readFileOrEmpty(absolutePath);
			const expectedBytes = insertManagedBlock(current, operation.bytes);
			await mkdir(dirname(absolutePath), { recursive: true });
			await atomicWriteFile(absolutePath, expectedBytes, {
				mode: snapshot.mode,
				beforeRename: () =>
					options.onEvent?.({
						point: "before-atomic-rename",
						operation,
						operationIndex,
					}),
			});
			return { operation, expectedBytes };
		}
		case "replace-block": {
			const current = new Uint8Array(await readFile(absolutePath));
			const expectedBytes = replaceManagedBlock(current, operation.bytes);
			await atomicWriteFile(absolutePath, expectedBytes, {
				mode: snapshot.mode,
				beforeRename: () =>
					options.onEvent?.({
						point: "before-atomic-rename",
						operation,
						operationIndex,
					}),
			});
			return { operation, expectedBytes };
		}
		case "remove-block": {
			const current = new Uint8Array(await readFile(absolutePath));
			const block = findManagedBlock(current);

			if (block === undefined || block.blockId !== operation.blockId) {
				throw new AgentsPackError(
					"DRIFT",
					`Managed block is missing or changed: ${operation.path}`,
				);
			}

			const expectedBytes = removeManagedBlock(current);
			await atomicWriteFile(absolutePath, expectedBytes, {
				mode: snapshot.mode,
				beforeRename: () =>
					options.onEvent?.({
						point: "before-atomic-rename",
						operation,
						operationIndex,
					}),
			});
			return { operation, expectedBytes };
		}
	}
}

async function validateAppliedOperation(
	paths: ScopePaths,
	applied: AppliedOperation,
): Promise<void> {
	const absolutePath = await resolveContainedPath(
		paths.root,
		applied.operation.path,
		{
			label: `Applied output ${applied.operation.path}`,
			rejectFinalSymlink: true,
		},
	);
	const info = await lstatOrUndefined(absolutePath);

	if (applied.expectAbsent) {
		if (info !== undefined) {
			throw new AgentsPackError(
				"EXECUTION_FAILED",
				`Removed output still exists: ${applied.operation.path}`,
			);
		}

		return;
	}

	if (
		info === undefined ||
		!info.isFile() ||
		applied.expectedBytes === undefined
	) {
		throw new AgentsPackError(
			"EXECUTION_FAILED",
			`Applied output is missing or invalid: ${applied.operation.path}`,
		);
	}

	const actual = new Uint8Array(await readFile(absolutePath));

	if (!bytesEqual(actual, applied.expectedBytes)) {
		throw new AgentsPackError(
			"EXECUTION_FAILED",
			`Applied output failed byte validation: ${applied.operation.path}`,
		);
	}
}

async function updateJournalState(
	transaction: PreparedTransaction,
	state: TransactionJournal["state"],
): Promise<void> {
	transaction.journal = { ...transaction.journal, state };
	await writeJournal(transaction.journalPath, transaction.journal);
}

async function writeJournal(
	journalPath: string,
	journal: TransactionJournal,
): Promise<void> {
	await atomicWriteFile(
		journalPath,
		encoder.encode(`${JSON.stringify(journal, null, 2)}\n`),
		{ mode: 0o600 },
	);
}

async function rollbackTransaction(
	transaction: PreparedTransaction,
	paths: ScopePaths,
): Promise<void> {
	await restoreSnapshots(
		paths.root,
		transaction.directory,
		transaction.journal,
	);
	await rm(transaction.directory, { recursive: true, force: true });
	await removeEmptyDirectories(
		paths.root,
		transaction.journal.createdDirectories,
	);
}

async function cleanupCommittedTransaction(
	transaction: PreparedTransaction,
	paths: ScopePaths,
): Promise<void> {
	await rm(transaction.directory, { recursive: true, force: true });
	await removeEmptyDirectories(
		paths.root,
		transaction.journal.createdDirectories,
	);
	await removeEmptyDirectories(
		paths.root,
		transaction.journal.pendingEmptyDirectories,
	);
}

async function recoverTransactions(paths: ScopePaths): Promise<string[]> {
	let entries: Dirent[];

	try {
		entries = await readdir(paths.transactionsDirectory, {
			withFileTypes: true,
		});
	} catch (error) {
		if (isMissing(error)) {
			return [];
		}

		throw new AgentsPackError(
			"RECOVERY_FAILED",
			"Unable to inspect Agents Pack transactions.",
			{ cause: error },
		);
	}

	const recovered: string[] = [];

	for (const entry of entries.sort((left, right) =>
		compareStrings(left.name, right.name),
	)) {
		if (!entry.isDirectory() || !TRANSACTION_DIRECTORY.test(entry.name)) {
			throw new AgentsPackError(
				"RECOVERY_FAILED",
				`Unexpected item in the transaction directory: ${entry.name}`,
			);
		}

		const directory = join(paths.transactionsDirectory, entry.name);

		if (!isPathInside(paths.transactionsDirectory, directory)) {
			throw new AgentsPackError(
				"RECOVERY_FAILED",
				`Transaction directory escapes its root: ${entry.name}`,
			);
		}

		const journalPath = join(directory, "journal.json");
		const journal = await loadJournalOrUndefined(journalPath, entry.name);

		if (journal === undefined) {
			await rm(directory, { recursive: true, force: true });
			recovered.push(entry.name);
			continue;
		}

		if (journal.state === "applying") {
			await restoreSnapshots(paths.root, directory, journal);
		}

		await rm(directory, { recursive: true, force: true });
		await removeEmptyDirectories(paths.root, journal.createdDirectories);

		if (journal.state === "committed") {
			await removeEmptyDirectories(paths.root, journal.pendingEmptyDirectories);
		}

		recovered.push(journal.id);
	}

	await rmdir(paths.transactionsDirectory).catch((error: unknown) => {
		if (!isMissing(error) && !hasCode(error, "ENOTEMPTY")) {
			throw error;
		}
	});
	await rmdir(paths.stateDirectory).catch((error: unknown) => {
		if (!isMissing(error) && !hasCode(error, "ENOTEMPTY")) {
			throw error;
		}
	});

	return recovered;
}

async function restoreSnapshots(
	root: string,
	transactionDirectory: string,
	journal: TransactionJournal,
): Promise<void> {
	for (const snapshot of [...journal.snapshots].reverse()) {
		const absolutePath = await resolveContainedPath(root, snapshot.path, {
			label: `Recovery output ${snapshot.path}`,
			rejectFinalSymlink: true,
		});

		if (!snapshot.existed) {
			const info = await lstatOrUndefined(absolutePath);

			if (info === undefined) {
				continue;
			}

			if (!info.isFile()) {
				throw new AgentsPackError(
					"RECOVERY_FAILED",
					`Recovery refuses to remove a non-file: ${snapshot.path}`,
				);
			}

			await unlink(absolutePath);
			await syncDirectory(dirname(absolutePath));
			continue;
		}

		if (
			snapshot.backupPath === undefined ||
			snapshot.sha256 === undefined ||
			snapshot.mode === undefined
		) {
			throw new AgentsPackError(
				"RECOVERY_FAILED",
				`Existing snapshot has incomplete backup metadata: ${snapshot.path}`,
			);
		}

		const backupPath = await resolveContainedPath(
			transactionDirectory,
			snapshot.backupPath,
			{
				label: `Transaction backup ${snapshot.backupPath}`,
				rejectFinalSymlink: true,
			},
		);
		const backup = new Uint8Array(await readFile(backupPath));

		if (hashBytes(backup) !== snapshot.sha256) {
			throw new AgentsPackError(
				"RECOVERY_FAILED",
				`Transaction backup hash is invalid: ${snapshot.path}`,
			);
		}

		await mkdir(dirname(absolutePath), { recursive: true });
		await atomicWriteFile(absolutePath, backup, { mode: snapshot.mode });
	}
}

async function loadJournalOrUndefined(
	path: string,
	directoryName: string,
): Promise<TransactionJournal | undefined> {
	let source: string;

	try {
		source = await readFile(path, "utf8");
	} catch (error) {
		if (isMissing(error)) {
			return undefined;
		}

		throw error;
	}

	let value: unknown;

	try {
		value = JSON.parse(source);
	} catch (cause) {
		throw new AgentsPackError(
			"RECOVERY_FAILED",
			`Transaction journal is not valid JSON: ${directoryName}`,
			{ cause },
		);
	}

	return parseJournal(value, directoryName);
}

function parseJournal(
	value: unknown,
	directoryName: string,
): TransactionJournal {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw malformedJournal(directoryName);
	}

	const record = value as Record<string, unknown>;

	if (
		record.schemaVersion !== 1 ||
		record.id !== directoryName ||
		(record.scope !== "global" && record.scope !== "repository") ||
		(record.command !== "init" &&
			record.command !== "update" &&
			record.command !== "eject") ||
		(record.state !== "prepared" &&
			record.state !== "applying" &&
			record.state !== "committed") ||
		typeof record.createdAt !== "string" ||
		!Array.isArray(record.snapshots) ||
		!Array.isArray(record.createdDirectories) ||
		!Array.isArray(record.pendingEmptyDirectories)
	) {
		throw malformedJournal(directoryName);
	}

	const snapshots = record.snapshots.map((snapshot, index) =>
		parseSnapshot(snapshot, index, directoryName),
	);
	const createdDirectories = parsePathArray(
		record.createdDirectories,
		"createdDirectories",
		directoryName,
	);
	const pendingEmptyDirectories = parsePathArray(
		record.pendingEmptyDirectories,
		"pendingEmptyDirectories",
		directoryName,
	);
	const journal: TransactionJournal = {
		schemaVersion: 1,
		id: record.id,
		scope: record.scope,
		command: record.command,
		state: record.state,
		createdAt: record.createdAt,
		snapshots,
		createdDirectories,
		pendingEmptyDirectories,
	};
	assertJournalOwnership(journal);

	return journal;
}

function parseSnapshot(
	value: unknown,
	index: number,
	directoryName: string,
): TransactionSnapshot {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw malformedJournal(directoryName);
	}

	const record = value as Record<string, unknown>;

	if (typeof record.path !== "string" || typeof record.existed !== "boolean") {
		throw malformedJournal(directoryName);
	}

	validateJournalPath(record.path, `snapshots[${index}].path`, directoryName);

	if (!record.existed) {
		return { path: record.path, existed: false };
	}

	if (
		typeof record.backupPath !== "string" ||
		typeof record.sha256 !== "string" ||
		!SHA256.test(record.sha256) ||
		typeof record.mode !== "number" ||
		!Number.isInteger(record.mode)
	) {
		throw malformedJournal(directoryName);
	}

	validateJournalPath(
		record.backupPath,
		`snapshots[${index}].backupPath`,
		directoryName,
	);

	if (!SNAPSHOT_BACKUP.test(record.backupPath)) {
		throw malformedJournal(directoryName);
	}

	return {
		path: record.path,
		existed: true,
		backupPath: record.backupPath,
		sha256: record.sha256,
		mode: record.mode,
	};
}

function parsePathArray(
	value: unknown[],
	field: string,
	directoryName: string,
): string[] {
	return value.map((path, index) => {
		if (typeof path !== "string") {
			throw malformedJournal(directoryName);
		}

		validateJournalPath(path, `${field}[${index}]`, directoryName);
		return path;
	});
}

function validateJournalPath(
	path: string,
	field: string,
	directoryName: string,
): void {
	try {
		validatePortableRelativePath(path, field);
	} catch (cause) {
		throw new AgentsPackError(
			"RECOVERY_FAILED",
			`Transaction journal contains an unsafe path: ${directoryName}`,
			{ cause },
		);
	}
}

function malformedJournal(directoryName: string): AgentsPackError {
	return new AgentsPackError(
		"RECOVERY_FAILED",
		`Transaction journal is malformed: ${directoryName}`,
	);
}

async function collectMissingDirectories(
	paths: ScopePaths,
	operations: readonly ChangeOperation[],
): Promise<string[]> {
	const missing = new Set<string>();
	const candidates = new Set<string>([
		paths.stateDirectory,
		paths.transactionsDirectory,
	]);

	for (const operation of operations) {
		if (operation.kind === "remove-empty-directory") {
			assertManagedTransactionPath(operation.path, paths.scope, operation.kind);
			continue;
		}

		const absolutePath = await resolveContainedPath(
			paths.root,
			operation.path,
			{
				label: `Transaction output ${operation.path}`,
				rejectFinalSymlink: true,
			},
		);
		let current = dirname(absolutePath);

		while (current !== paths.root && isPathInside(paths.root, current)) {
			candidates.add(current);
			current = dirname(current);
		}
	}

	for (const candidate of candidates) {
		if ((await lstatOrUndefined(candidate)) === undefined) {
			missing.add(toPortablePath(paths.root, candidate));
		}
	}

	return [...missing].sort(comparePathsDeepestFirst);
}

async function removeEmptyDirectories(
	root: string,
	paths: readonly string[],
): Promise<void> {
	for (const path of [...new Set(paths)].sort(comparePathsDeepestFirst)) {
		const absolutePath = await resolveContainedPath(root, path, {
			label: `Empty directory ${path}`,
			rejectFinalSymlink: true,
		});

		await rmdir(absolutePath).catch((error: unknown) => {
			if (!isMissing(error) && !hasCode(error, "ENOTEMPTY")) {
				throw error;
			}
		});
	}
}

function assertPlanMatchesInvocation(
	plan: ChangePlan,
	options: RunMutationOptions,
): void {
	if (plan.scope !== options.paths.scope || plan.command !== options.command) {
		throw new AgentsPackError(
			"EXECUTION_FAILED",
			"The change plan does not match the locked command and scope.",
		);
	}
}

function assertJournalOwnership(journal: TransactionJournal): void {
	for (const snapshot of journal.snapshots) {
		assertManagedTransactionPath(
			snapshot.path,
			journal.scope,
			"snapshot",
			true,
		);
	}

	for (const directory of journal.createdDirectories) {
		const ownsDirectory = journal.snapshots.some((snapshot) =>
			snapshot.path.startsWith(`${directory}/`),
		);

		if (
			!ownsDirectory &&
			directory !== ".agents-pack" &&
			directory !== ".agents-pack/transactions"
		) {
			throw new AgentsPackError(
				"RECOVERY_FAILED",
				`Transaction journal contains an unowned created directory: ${directory}`,
			);
		}
	}

	for (const directory of journal.pendingEmptyDirectories) {
		assertManagedTransactionPath(
			directory,
			journal.scope,
			"remove-empty-directory",
			true,
		);
	}
}

function assertManagedTransactionPath(
	path: string,
	scope: ScopePaths["scope"],
	kind: ChangeOperation["kind"] | "snapshot",
	recovery = false,
): void {
	const errorCode = recovery ? "RECOVERY_FAILED" : "OWNERSHIP_CONFLICT";

	if (kind === "remove-empty-directory") {
		if (path !== ".agents-pack" && path !== ".agents-pack/transactions") {
			throw new AgentsPackError(
				errorCode,
				`Transaction refuses to remove an unowned directory: ${path}`,
			);
		}

		return;
	}

	const stateConfig =
		scope === "global" ? ".agents-pack/config.toml" : ".agents-pack/pack.toml";
	const exactPaths = new Set([
		stateConfig,
		".agents-pack/lock.json",
		scope === "global" ? ".codex/AGENTS.md" : "AGENTS.md",
	]);
	const prefixes = [
		".agents/skills/",
		".claude/rules/agents-pack/",
		".claude/skills/",
		".cursor/rules/agents-pack/",
		".cursor/skills/",
	];

	if (
		!exactPaths.has(path) &&
		!prefixes.some((prefix) => path.startsWith(prefix))
	) {
		throw new AgentsPackError(
			errorCode,
			`Transaction path is outside Agents Pack-owned roots: ${path}`,
		);
	}
}

function isStateOperation(operation: ChangeOperation): boolean {
	return (
		operation.path === ".agents-pack/pack.toml" ||
		operation.path === ".agents-pack/config.toml" ||
		operation.path === ".agents-pack/lock.json"
	);
}

async function readFileOrEmpty(path: string): Promise<Uint8Array> {
	try {
		return new Uint8Array(await readFile(path));
	} catch (error) {
		if (isMissing(error)) {
			return new Uint8Array();
		}

		throw error;
	}
}

async function lstatOrUndefined(
	path: string,
): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
	try {
		return await lstat(path);
	} catch (error) {
		if (isMissing(error)) {
			return undefined;
		}

		throw error;
	}
}

function comparePathsDeepestFirst(left: string, right: string): number {
	const depthDifference = right.split("/").length - left.split("/").length;
	return depthDifference !== 0 ? depthDifference : compareStrings(right, left);
}

function compareStrings(left: string, right: string): number {
	if (left < right) {
		return -1;
	}

	if (left > right) {
		return 1;
	}

	return 0;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
	return (
		left.byteLength === right.byteLength &&
		left.every((byte, index) => byte === right[index])
	);
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
