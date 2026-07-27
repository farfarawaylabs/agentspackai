#!/usr/bin/env bun

import { runEject } from "../commands/eject.ts";
import { runInstall, runRemove } from "../commands/components.ts";
import { runInit } from "../commands/init.ts";
import { runList } from "../commands/list.ts";
import { runStatus } from "../commands/status.ts";
import { runUpdate } from "../commands/update.ts";
import { AgentsPackError } from "../core/errors.ts";
import { parseArguments } from "./arguments.ts";
import { commandHelp, generalHelp } from "./output.ts";

export async function run(argv: string[]): Promise<number> {
	const parsed = parseArguments(argv);

	if (parsed.unknownCommand !== undefined) {
		console.error(`Unknown command: ${parsed.unknownCommand}\n`);
		console.error(generalHelp());
		return 2;
	}

	if (parsed.command === undefined) {
		console.log(generalHelp());
		return 0;
	}

	if (parsed.help) {
		console.log(commandHelp(parsed.command));
		return 0;
	}

	try {
		switch (parsed.command) {
			case "init":
				await runInit(parsed.rest);
				break;
			case "status":
				await runStatus(parsed.rest);
				break;
			case "list":
				await runList(parsed.rest);
				break;
			case "install":
				await runInstall(parsed.rest);
				break;
			case "remove":
				await runRemove(parsed.rest);
				break;
			case "update":
				await runUpdate(parsed.rest);
				break;
			case "eject":
				await runEject(parsed.rest);
				break;
		}

		return 0;
	} catch (error) {
		if (error instanceof AgentsPackError) {
			console.error(`${error.code}: ${error.message}`);
			return error.exitCode;
		}

		throw error;
	}
}

if (import.meta.main) {
	process.exitCode = await run(process.argv.slice(2));
}
