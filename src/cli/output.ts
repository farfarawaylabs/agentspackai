import type { CommandName } from "./arguments.ts";

const COMMAND_SUMMARIES: Record<CommandName, string> = {
	init: "Initialize Agents Pack in global or repository scope.",
	status: "Inspect the current Agents Pack installation.",
	update: "Preview or apply a content-pack update.",
	eject: "Remove managed Agents Pack content safely.",
};

export function generalHelp(): string {
	return `Agents Pack

Usage:
  agents-pack <command> [options]

Commands:
  init      ${COMMAND_SUMMARIES.init}
  status    ${COMMAND_SUMMARIES.status}
  update    ${COMMAND_SUMMARIES.update}
  eject     ${COMMAND_SUMMARIES.eject}

Run agents-pack <command> --help for command-specific help.
`;
}

export function commandHelp(command: CommandName): string {
	if (command === "init") {
		return `Agents Pack: init

Usage:
  agents-pack init --scope <repository|global> --agents <list> --pack <path> [--yes] [--dry-run]

${COMMAND_SUMMARIES.init}

Options:
  --scope <scope>  Install in repository or global scope.
  --agents <list>  Comma-separated claude,codex,cursor selection.
  --pack <path>    Local content-pack directory.
  --yes            Apply without an interactive confirmation.
  --dry-run        Print the plan without writing.
`;
	}

	if (command === "status") {
		return `Agents Pack: status

Usage:
  agents-pack status

${COMMAND_SUMMARIES.status}

Status is always read-only, including when recovery is required.
`;
	}

	if (command === "update") {
		return `Agents Pack: update

Usage:
  agents-pack update --pack <path> [--yes] [--dry-run]

${COMMAND_SUMMARIES.update}

Options:
  --pack <path>  Proposed local content-pack directory.
  --yes          Apply without an interactive confirmation.
  --dry-run      Print the update plan without writing.
`;
	}

	if (command === "eject") {
		return `Agents Pack: eject

Usage:
  agents-pack eject [--yes] [--dry-run]

${COMMAND_SUMMARIES.eject}

Options:
  --yes      Apply without an interactive confirmation.
  --dry-run  Print the removal plan without writing.
`;
	}

	return `Agents Pack: ${command}

Usage:
  agents-pack ${command} [options]

${COMMAND_SUMMARIES[command]}

This command is not wired to the lifecycle core yet.
`;
}
