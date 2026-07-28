import type { CommandName } from "./arguments.ts";
import { CLI_VERSION } from "../version.ts";

const COMMAND_SUMMARIES: Record<CommandName, string> = {
	init: "Initialize Agents Pack in global or repository scope.",
	status: "Inspect the current Agents Pack installation.",
	list: "List installed and available components.",
	install: "Install a component from the current pack.",
	remove: "Remove an optional component.",
	create: "Create a canonical user-owned skill or subagent.",
	fork: "Copy an official component into user ownership.",
	sync: "Render user-owned components for selected agents.",
	update: "Preview or apply a content-pack update.",
	pin: "Keep the currently installed pack version.",
	unpin: "Allow forward content-pack updates again.",
	rollback: "Restore an older pack version from the local cache.",
	eject: "Remove managed Agents Pack content safely.",
};

export function generalHelp(): string {
	return `Agents Pack ${CLI_VERSION}

Usage:
  agents-pack <command> [options]
  agents-pack --version

Commands:
  init      ${COMMAND_SUMMARIES.init}
  status    ${COMMAND_SUMMARIES.status}
  list      ${COMMAND_SUMMARIES.list}
  install   ${COMMAND_SUMMARIES.install}
  remove    ${COMMAND_SUMMARIES.remove}
  create    ${COMMAND_SUMMARIES.create}
  fork      ${COMMAND_SUMMARIES.fork}
  sync      ${COMMAND_SUMMARIES.sync}
  update    ${COMMAND_SUMMARIES.update}
  pin       ${COMMAND_SUMMARIES.pin}
  unpin     ${COMMAND_SUMMARIES.unpin}
  rollback  ${COMMAND_SUMMARIES.rollback}
  eject     ${COMMAND_SUMMARIES.eject}

Run agents-pack <command> --help for command-specific help.
`;
}

export function commandHelp(command: CommandName): string {
	if (command === "init") {
		return `Agents Pack: init

Usage:
  agents-pack init --scope <repository|global> --agents <list> --components <choice> [--pack <path>] [--yes] [--dry-run]

${COMMAND_SUMMARIES.init}

Options:
  --scope <scope>  Install in repository or global scope.
  --agents <list>  Comma-separated claude,codex,cursor selection.
  --pack <path>    Use a local content-pack directory instead of the official pack.
  --components <choice>
                   recommended, all, or comma-separated component IDs.
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

	if (command === "list") {
		return `Agents Pack: list

Usage:
  agents-pack list [--installed|--available] [--kind <kind>]

${COMMAND_SUMMARIES.list}

Options:
  --installed   Show only selected components.
  --available   Show only unselected components.
  --kind <kind> Filter by instruction, skill, or subagent.
`;
	}

	if (command === "install" || command === "remove") {
		return `Agents Pack: ${command}

Usage:
  agents-pack ${command} <component-id> [--yes] [--dry-run]

${COMMAND_SUMMARIES[command]}

Options:
  --yes      Apply without an interactive confirmation.
  --dry-run  Print the plan without writing.
`;
	}

	if (command === "update") {
		return `Agents Pack: update

Usage:
  agents-pack update --check [--pack <path>]
  agents-pack update [--pack <path>] [--yes] [--dry-run]

${COMMAND_SUMMARIES.update}

Options:
  --pack <path>  Use a local candidate instead of the official registry.
  --check        Show version and release information without writing.
  --yes          Apply without an interactive confirmation.
  --dry-run      Print the update plan without writing.
`;
	}

	if (command === "pin" || command === "unpin") {
		return `Agents Pack: ${command}

Usage:
  agents-pack ${command}

${COMMAND_SUMMARIES[command]}
`;
	}

	if (command === "rollback") {
		return `Agents Pack: rollback

Usage:
  agents-pack rollback [version] [--yes] [--dry-run]

${COMMAND_SUMMARIES.rollback}

Without a version, rollback chooses the newest cached version older than the
installed version. A successful rollback pins that version.

Options:
  --yes      Apply without an interactive confirmation.
  --dry-run  Print the rollback plan without writing.
`;
	}

	if (command === "create") {
		return `Agents Pack: create

Usage:
  agents-pack create skill <name> --description <text> [--yes] [--dry-run]
  agents-pack create subagent <name> --description <text> [--write] [--yes] [--dry-run]

${COMMAND_SUMMARIES.create}

The canonical source is created under .agents-pack/user. Edit that source, then
run agents-pack sync to regenerate provider copies.

Options:
  --description <text>  Explain what the component does and when to use it.
  --write               Give a subagent workspace-write access; default is read-only.
  --yes                 Apply without an interactive confirmation.
  --dry-run             Print the plan without writing.
`;
	}

	if (command === "fork") {
		return `Agents Pack: fork

Usage:
  agents-pack fork <official-component> --name <user-name> [--yes] [--dry-run]

${COMMAND_SUMMARIES.fork}

The new name cannot use the reserved ap- prefix.

Options:
  --name <name>  Name for the user-owned copy.
  --yes          Apply without an interactive confirmation.
  --dry-run      Print the plan without writing.
`;
	}

	if (command === "sync") {
		return `Agents Pack: sync

Usage:
  agents-pack sync [--yes] [--dry-run]

${COMMAND_SUMMARIES.sync}

Options:
  --yes      Apply without an interactive confirmation.
  --dry-run  Print the plan without writing.
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
