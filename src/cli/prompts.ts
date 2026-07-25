import { createInterface } from "node:readline/promises";
import type { InitArguments } from "./arguments.ts";
import { parseInitArguments } from "./arguments.ts";

export async function promptForInitArguments(
	partial: InitArguments,
): Promise<InitArguments> {
	const readline = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		const scope =
			partial.scope ??
			parseScope(
				await readline.question("Scope [repository/global] (repository): "),
			);
		const agents =
			partial.agents ??
			parseInitArguments([
				"--agents",
				(await readline.question("Agents [claude,codex,cursor] (all): ")) ||
					"claude,codex,cursor",
			]).agents;
		const packPath =
			partial.packPath ?? (await readline.question("Local pack path: ")).trim();

		return {
			...partial,
			scope,
			agents,
			packPath,
		};
	} finally {
		readline.close();
	}
}

export async function confirmApply(): Promise<boolean> {
	const readline = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		const answer = (await readline.question("Apply this plan? [y/N] "))
			.trim()
			.toLowerCase();
		return answer === "y" || answer === "yes";
	} finally {
		readline.close();
	}
}

export async function promptForPackPath(): Promise<string> {
	const readline = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		return (await readline.question("Local pack path: ")).trim();
	} finally {
		readline.close();
	}
}

function parseScope(value: string): "global" | "repository" {
	const normalized = value.trim().toLowerCase();

	if (normalized === "" || normalized === "repository") {
		return "repository";
	}

	if (normalized === "global") {
		return "global";
	}

	return parseInitArguments(["--scope", normalized]).scope ?? "repository";
}
