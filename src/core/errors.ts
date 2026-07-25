export type AgentsPackErrorCode =
	| "CONCURRENT_OPERATION"
	| "DRIFT"
	| "EXECUTION_FAILED"
	| "INVALID_PACK"
	| "INVALID_PATH"
	| "MALFORMED_STATE"
	| "NOT_IMPLEMENTED"
	| "NOT_INITIALIZED"
	| "OWNERSHIP_CONFLICT"
	| "RECOVERY_FAILED"
	| "SCOPE_CONFLICT"
	| "UNSUPPORTED"
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
