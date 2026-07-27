import { AgentsPackError } from "../core/errors.ts";
import type { ComponentChoice } from "../core/selection.ts";

export const COMMAND_NAMES = [
	"init",
	"status",
	"list",
	"install",
	"remove",
	"create",
	"fork",
	"sync",
	"update",
	"eject",
] as const;

export type CommandName = (typeof COMMAND_NAMES)[number];

export interface ParsedArguments {
	command?: CommandName;
	help: boolean;
	rest: string[];
	unknownCommand?: string;
}

export interface InitArguments {
	scope?: "global" | "repository";
	agents?: ("claude" | "codex" | "cursor")[];
	packPath?: string;
	components?: ComponentChoice;
	yes: boolean;
	dryRun: boolean;
}

export interface UpdateArguments {
	packPath?: string;
	yes: boolean;
	dryRun: boolean;
}

export interface EjectArguments {
	yes: boolean;
	dryRun: boolean;
}

export interface ComponentMutationArguments {
	componentId: string;
	yes: boolean;
	dryRun: boolean;
}

export interface ListArguments {
	status?: "installed" | "available";
	kind?: "instruction" | "skill" | "subagent";
}

export interface CreateArguments {
	kind: "skill" | "subagent";
	name: string;
	description?: string;
	workspaceWrite: boolean;
	yes: boolean;
	dryRun: boolean;
}

export interface ForkArguments {
	componentId: string;
	name: string;
	yes: boolean;
	dryRun: boolean;
}

export interface SyncArguments {
	yes: boolean;
	dryRun: boolean;
}

export function parseArguments(argv: string[]): ParsedArguments {
	const [first, ...rest] = argv;

	if (first === undefined || first === "--help" || first === "-h") {
		return { help: true, rest };
	}

	if (!isCommandName(first)) {
		return {
			help: false,
			rest,
			unknownCommand: first,
		};
	}

	return {
		command: first,
		help: rest.includes("--help") || rest.includes("-h"),
		rest,
	};
}

function isCommandName(value: string): value is CommandName {
	return COMMAND_NAMES.some((command) => command === value);
}

export function parseInitArguments(args: readonly string[]): InitArguments {
	const parsed: InitArguments = { yes: false, dryRun: false };

	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];

		switch (argument) {
			case "--scope": {
				const value = requireOptionValue(args, index, "--scope");

				if (value !== "global" && value !== "repository") {
					throw usage("--scope must be global or repository.");
				}

				if (parsed.scope !== undefined) {
					throw usage("--scope may be provided only once.");
				}

				parsed.scope = value;
				index += 1;
				break;
			}
			case "--agents": {
				const value = requireOptionValue(args, index, "--agents");

				if (parsed.agents !== undefined) {
					throw usage("--agents may be provided only once.");
				}

				parsed.agents = parseAgents(value);
				index += 1;
				break;
			}
			case "--pack":
				if (parsed.packPath !== undefined) {
					throw usage("--pack may be provided only once.");
				}

				parsed.packPath = requireOptionValue(args, index, "--pack");
				index += 1;
				break;
			case "--components":
				if (parsed.components !== undefined) {
					throw usage("--components may be provided only once.");
				}

				parsed.components = parseComponents(
					requireOptionValue(args, index, "--components"),
				);
				index += 1;
				break;
			case "--yes":
				parsed.yes = true;
				break;
			case "--dry-run":
				parsed.dryRun = true;
				break;
			default:
				throw usage(`Unknown init option: ${argument ?? ""}`);
		}
	}

	return parsed;
}

export function parseComponentMutationArguments(
	command: "install" | "remove",
	args: readonly string[],
): ComponentMutationArguments {
	const parsed = { componentId: "", yes: false, dryRun: false };

	for (const argument of args) {
		if (argument === "--yes") {
			if (parsed.yes) {
				throw usage("--yes may be provided only once.");
			}
			parsed.yes = true;
			continue;
		}

		if (argument === "--dry-run") {
			if (parsed.dryRun) {
				throw usage("--dry-run may be provided only once.");
			}
			parsed.dryRun = true;
			continue;
		}

		if (argument.startsWith("--")) {
			throw usage(`Unknown ${command} option: ${argument}`);
		}

		if (parsed.componentId.length > 0) {
			throw usage(`${command} accepts exactly one component ID.`);
		}

		parsed.componentId = argument;
	}

	if (parsed.componentId.length === 0) {
		throw usage(`${command} requires a component ID.`);
	}

	return parsed;
}

export function parseListArguments(args: readonly string[]): ListArguments {
	const parsed: ListArguments = {};

	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];

		if (argument === "--installed" || argument === "--available") {
			if (parsed.status !== undefined) {
				throw usage("--installed and --available cannot be combined.");
			}
			parsed.status = argument === "--installed" ? "installed" : "available";
			continue;
		}

		if (argument === "--kind") {
			if (parsed.kind !== undefined) {
				throw usage("--kind may be provided only once.");
			}
			const value = requireOptionValue(args, index, "--kind");

			if (
				value !== "instruction" &&
				value !== "skill" &&
				value !== "subagent"
			) {
				throw usage("--kind must be instruction, skill, or subagent.");
			}

			parsed.kind = value;
			index += 1;
			continue;
		}

		throw usage(`Unknown list option: ${argument ?? ""}`);
	}

	return parsed;
}

export function parseCreateArguments(args: readonly string[]): CreateArguments {
	const parsed: CreateArguments = {
		kind: "skill",
		name: "",
		workspaceWrite: false,
		yes: false,
		dryRun: false,
	};
	const positionals: string[] = [];

	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];

		switch (argument) {
			case "--description":
				if (parsed.description !== undefined) {
					throw usage("--description may be provided only once.");
				}
				parsed.description = requireOptionValue(args, index, "--description");
				index += 1;
				break;
			case "--write":
				if (parsed.workspaceWrite) {
					throw usage("--write may be provided only once.");
				}
				parsed.workspaceWrite = true;
				break;
			case "--yes":
				if (parsed.yes) {
					throw usage("--yes may be provided only once.");
				}
				parsed.yes = true;
				break;
			case "--dry-run":
				if (parsed.dryRun) {
					throw usage("--dry-run may be provided only once.");
				}
				parsed.dryRun = true;
				break;
			default:
				if (argument?.startsWith("--")) {
					throw usage(`Unknown create option: ${argument}`);
				}
				positionals.push(argument ?? "");
		}
	}

	if (positionals.length !== 2) {
		throw usage("create requires a kind and name.");
	}

	const [kind, name] = positionals;

	if (kind !== "skill" && kind !== "subagent") {
		throw usage("create kind must be skill or subagent.");
	}

	if (name === undefined || name.length === 0) {
		throw usage("create requires a component name.");
	}

	if (kind === "skill" && parsed.workspaceWrite) {
		throw usage("--write is valid only for subagents.");
	}

	return { ...parsed, kind, name };
}

export function parseForkArguments(args: readonly string[]): ForkArguments {
	const parsed: ForkArguments = {
		componentId: "",
		name: "",
		yes: false,
		dryRun: false,
	};

	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];

		switch (argument) {
			case "--name":
				if (parsed.name.length > 0) {
					throw usage("--name may be provided only once.");
				}
				parsed.name = requireOptionValue(args, index, "--name");
				index += 1;
				break;
			case "--yes":
				if (parsed.yes) {
					throw usage("--yes may be provided only once.");
				}
				parsed.yes = true;
				break;
			case "--dry-run":
				if (parsed.dryRun) {
					throw usage("--dry-run may be provided only once.");
				}
				parsed.dryRun = true;
				break;
			default:
				if (argument?.startsWith("--")) {
					throw usage(`Unknown fork option: ${argument}`);
				}
				if (parsed.componentId.length > 0) {
					throw usage("fork accepts exactly one official component ID.");
				}
				parsed.componentId = argument ?? "";
		}
	}

	if (parsed.componentId.length === 0 || parsed.name.length === 0) {
		throw usage("fork requires an official component ID and --name.");
	}

	return parsed;
}

export function parseSyncArguments(args: readonly string[]): SyncArguments {
	const parsed: SyncArguments = { yes: false, dryRun: false };

	for (const argument of args) {
		if (argument === "--yes") {
			if (parsed.yes) {
				throw usage("--yes may be provided only once.");
			}
			parsed.yes = true;
			continue;
		}

		if (argument === "--dry-run") {
			if (parsed.dryRun) {
				throw usage("--dry-run may be provided only once.");
			}
			parsed.dryRun = true;
			continue;
		}

		throw usage(`Unknown sync option: ${argument}`);
	}

	return parsed;
}

export function parseUpdateArguments(args: readonly string[]): UpdateArguments {
	const parsed: UpdateArguments = { yes: false, dryRun: false };

	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];

		switch (argument) {
			case "--pack":
				if (parsed.packPath !== undefined) {
					throw usage("--pack may be provided only once.");
				}

				parsed.packPath = requireOptionValue(args, index, "--pack");
				index += 1;
				break;
			case "--yes":
				parsed.yes = true;
				break;
			case "--dry-run":
				parsed.dryRun = true;
				break;
			default:
				throw usage(`Unknown update option: ${argument ?? ""}`);
		}
	}

	return parsed;
}

export function parseEjectArguments(args: readonly string[]): EjectArguments {
	const parsed: EjectArguments = { yes: false, dryRun: false };

	for (const argument of args) {
		switch (argument) {
			case "--yes":
				if (parsed.yes) {
					throw usage("--yes may be provided only once.");
				}

				parsed.yes = true;
				break;
			case "--dry-run":
				if (parsed.dryRun) {
					throw usage("--dry-run may be provided only once.");
				}

				parsed.dryRun = true;
				break;
			default:
				throw usage(`Unknown eject option: ${argument}`);
		}
	}

	return parsed;
}

export function assertNoCommandArguments(
	command: CommandName,
	args: readonly string[],
): void {
	if (args.length > 0) {
		throw usage(`The ${command} command does not accept options yet.`);
	}
}

function parseAgents(value: string): ("claude" | "codex" | "cursor")[] {
	const values = value.split(",");

	if (values.some((agent) => agent.length === 0)) {
		throw usage("--agents must be a comma-separated agent list.");
	}

	const agents: ("claude" | "codex" | "cursor")[] = [];

	for (const agent of values) {
		if (agent !== "claude" && agent !== "codex" && agent !== "cursor") {
			throw usage(`Unsupported agent in --agents: ${agent}`);
		}

		if (agents.includes(agent)) {
			throw usage(`Duplicate agent in --agents: ${agent}`);
		}

		agents.push(agent);
	}

	return agents;
}

function parseComponents(value: string): ComponentChoice {
	if (value === "recommended" || value === "all") {
		return { kind: value };
	}

	const ids = value.split(",");

	if (ids.some((id) => id.length === 0)) {
		throw usage(
			"--components must be recommended, all, or a comma-separated component list.",
		);
	}

	if (new Set(ids).size !== ids.length) {
		throw usage("--components must not contain duplicate component IDs.");
	}

	return { kind: "explicit", ids };
}

function requireOptionValue(
	args: readonly string[],
	index: number,
	option: string,
): string {
	const value = args[index + 1];

	if (value === undefined || value.startsWith("--")) {
		throw usage(`${option} requires a value.`);
	}

	return value;
}

function usage(message: string): AgentsPackError {
	return new AgentsPackError("USAGE", message, { exitCode: 2 });
}
