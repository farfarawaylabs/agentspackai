export type Scope = "global" | "repository";

export type AgentTarget = "claude" | "codex" | "cursor";

export interface PathContext {
	cwd: string;
	userHome: string;
}

export interface PackManifest {
	schemaVersion: 1;
	id: string;
	version: string;
	title: string;
	components: PackComponent[];
}

export type ComponentKind = "instruction" | "skill" | "subagent";
export type ComponentSelection = "required" | "recommended" | "optional";

export interface PackComponent {
	id: string;
	kind: ComponentKind;
	title: string;
	summary: string;
	category: string;
	selection: ComponentSelection;
	source: string;
	targets: AgentTarget[];
}

export interface PackFile {
	path: string;
	bytes: Uint8Array;
	sha256: string;
}

export interface LoadedPack {
	root: string;
	manifest: PackManifest;
	files: PackFile[];
	sha256: string;
}

export interface ScopeConfig {
	schemaVersion: 1;
	scope: Scope;
	targets: AgentTarget[];
	components: string[];
	pack: {
		id: string;
		source: "local";
	};
}

export interface LockedPack {
	id: string;
	version: string;
	sha256: string;
	source: {
		kind: "local";
	};
}

export interface LockedComponent {
	id: string;
	kind: ComponentKind;
	sha256: string;
}

interface LockOutputBase {
	componentId: string;
	adapter: AgentTarget;
	path: string;
	sha256: string;
}

export interface LockedFileOutput extends LockOutputBase {
	kind: "file";
}

export interface LockedManagedBlockOutput extends LockOutputBase {
	kind: "managed-block";
	adapter: "codex";
	blockId: string;
}

export type LockedOutput = LockedFileOutput | LockedManagedBlockOutput;

export interface LockFile {
	schemaVersion: 1;
	rendererVersion: 1;
	pack: LockedPack;
	components: LockedComponent[];
	outputs: LockedOutput[];
}

export interface BaseCacheFile {
	path: string;
	sha256: string;
	contentBase64: string;
}

export interface BaseCache {
	schemaVersion: 1;
	pack: LockedPack;
	files: BaseCacheFile[];
}

export interface ScopePaths {
	scope: Scope;
	root: string;
	stateDirectory: string;
	configPath: string;
	lockPath: string;
	operationLockPath: string;
	transactionsDirectory: string;
}

export interface RenderedPack {
	components: PackComponent[];
	outputs: DesiredOutput[];
	warnings: string[];
}

export type DesiredOutput =
	| {
			kind: "file";
			componentId: string;
			adapter: AgentTarget;
			path: string;
			bytes: Uint8Array;
	  }
	| {
			kind: "managed-block";
			componentId: string;
			adapter: "codex";
			path: string;
			blockId: string;
			bytes: Uint8Array;
	  };

export type ManagedStatus =
	| "absent"
	| "clean"
	| "missing"
	| "modified"
	| "malformed";

export interface InspectedOutput {
	output: LockedOutput;
	status: Exclude<ManagedStatus, "absent">;
	currentHash?: string;
	currentBytes?: Uint8Array;
	blockBytes?: Uint8Array;
}

export interface InspectedDestination {
	desired: DesiredOutput;
	status: "absent" | "shared-file";
	existingBytes?: Uint8Array;
}

export type ChangeOperation =
	| { kind: "create-file"; path: string; bytes: Uint8Array }
	| { kind: "replace-file"; path: string; bytes: Uint8Array }
	| { kind: "remove-file"; path: string }
	| {
			kind: "insert-block";
			path: string;
			blockId: string;
			bytes: Uint8Array;
	  }
	| {
			kind: "replace-block";
			path: string;
			blockId: string;
			bytes: Uint8Array;
	  }
	| { kind: "remove-block"; path: string; blockId: string }
	| { kind: "remove-empty-directory"; path: string };

export interface ChangePlan {
	command: "init" | "update" | "install" | "remove" | "eject";
	scope: Scope;
	operations: ChangeOperation[];
	warnings: string[];
}

export type TransactionState = "prepared" | "applying" | "committed";

export interface TransactionSnapshot {
	path: string;
	existed: boolean;
	backupPath?: string;
	sha256?: string;
	mode?: number;
}

export interface TransactionJournal {
	schemaVersion: 1;
	id: string;
	scope: Scope;
	command: ChangePlan["command"];
	state: TransactionState;
	createdAt: string;
	snapshots: TransactionSnapshot[];
	createdDirectories: string[];
	pendingEmptyDirectories: string[];
}

export type ExecutorEventPoint =
	| "before-first-write"
	| "before-atomic-rename"
	| "after-operation"
	| "before-state-write"
	| "after-commit";

export interface ExecutorEvent {
	point: ExecutorEventPoint;
	operation?: ChangeOperation;
	operationIndex?: number;
}

export interface MutationResult {
	plan: ChangePlan;
	appliedOperations: number;
	recoveredTransactions: string[];
	staleLockRecovered: boolean;
}
