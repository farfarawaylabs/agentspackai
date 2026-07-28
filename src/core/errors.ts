export type AgentsPackErrorCode =
	| "CONCURRENT_OPERATION"
	| "DRIFT"
	| "EXECUTION_FAILED"
	| "INVALID_PACK"
	| "INVALID_PATH"
	| "INCOMPATIBLE_COMPONENT"
	| "MALFORMED_STATE"
	| "NOT_IMPLEMENTED"
	| "NOT_INITIALIZED"
	| "OWNERSHIP_CONFLICT"
	| "PINNED"
	| "RECOVERY_FAILED"
	| "REMOTE_ERROR"
	| "SCOPE_CONFLICT"
	| "UNSUPPORTED"
	| "UNKNOWN_COMPONENT"
	| "USAGE";

export class AgentsPackError extends Error {
	readonly code: AgentsPackErrorCode;
	readonly exitCode: number;

	constructor(
		code: AgentsPackErrorCode,
		message: string,
		options: { cause?: unknown; exitCode?: number } = {},
	) {
		super(message, { cause: options.cause });
		this.name = "AgentsPackError";
		this.code = code;
		this.exitCode = options.exitCode ?? 1;
	}
}
