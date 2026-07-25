import { AgentsPackError } from "../core/errors.ts";

export const COMMAND_NAMES = ["init", "status", "update", "eject"] as const;

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
