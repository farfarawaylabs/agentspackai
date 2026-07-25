import type { ChangeOperation, ChangePlan } from "./types.ts";

const OPERATION_LABELS: Record<ChangeOperation["kind"], string> = {
	"create-file": "CREATE FILE",
	"replace-file": "REPLACE FILE",
	"remove-file": "REMOVE FILE",
	"insert-block": "INSERT BLOCK",
	"replace-block": "REPLACE BLOCK",
	"remove-block": "REMOVE BLOCK",
	"remove-empty-directory": "REMOVE EMPTY DIRECTORY",
};

export function formatChangePlan(plan: ChangePlan): string {
	const lines = [
		`Agents Pack ${plan.command} plan`,
		`Scope: ${plan.scope}`,
		"",
	];

	if (plan.operations.length === 0) {
		lines.push("No changes.");
	} else {
		lines.push("Operations:");

		for (const operation of plan.operations) {
			lines.push(`  ${formatOperation(operation)}`);
		}
	}

	if (plan.warnings.length > 0) {
		lines.push("", "Warnings:");

		for (const warning of plan.warnings) {
			lines.push(`  - ${warning}`);
		}
	}

	return `${lines.join("\n")}\n`;
}

function formatOperation(operation: ChangeOperation): string {
	const label = OPERATION_LABELS[operation.kind];

	if (
		operation.kind === "insert-block" ||
		operation.kind === "replace-block" ||
		operation.kind === "remove-block"
	) {
		return `${label} ${operation.blockId} -> ${operation.path}`;
	}

	return `${label} ${operation.path}`;
}
