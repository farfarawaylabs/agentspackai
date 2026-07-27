import { createInterface } from "node:readline/promises";
import { AgentsPackError } from "../core/errors.ts";
import {
	expandComponentChoice,
	isCompatible,
	sortComponentsForDisplay,
	type ComponentChoice,
} from "../core/selection.ts";
import type { AgentTarget, LoadedPack } from "../core/types.ts";
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

export async function promptForComponentChoice(
	pack: LoadedPack,
	targets: readonly AgentTarget[],
): Promise<ComponentChoice> {
	const readline = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		const compatible = sortComponentsForDisplay(
			pack.manifest.components.filter((component) =>
				isCompatible(component, targets),
			),
		);
		const recommended = new Set(
			expandComponentChoice(pack.manifest, targets, { kind: "recommended" }),
		);
		const lines = ["", "Available components:"];
		let lastCategory = "";

		for (const component of compatible) {
			if (component.category !== lastCategory) {
				lastCategory = component.category;
				lines.push(`\n${formatCategory(component.category)}`);
			}

			const marker =
				component.selection === "required"
					? "required"
					: recommended.has(component.id)
						? "recommended"
						: "optional";
			lines.push(`  ${component.id} [${marker}]\n    ${component.summary}`);
		}

		process.stdout.write(`${lines.join("\n")}\n\n`);
		const mode = (
			await readline.question(
				"Components [recommended/all/custom] (recommended): ",
			)
		)
			.trim()
			.toLowerCase();

		if (mode === "" || mode === "recommended") {
			return { kind: "recommended" };
		}

		if (mode === "all") {
			return { kind: "all" };
		}

		if (mode !== "custom") {
			throw new AgentsPackError(
				"USAGE",
				"Component choice must be recommended, all, or custom.",
				{ exitCode: 2 },
			);
		}

		const selected = new Set(recommended);
		const required = new Set(
			compatible
				.filter((component) => component.selection === "required")
				.map((component) => component.id),
		);

		while (true) {
			const value = (
				await readline.question(
					`Selected ${selected.size}/${compatible.length}. Toggle a component ID or category, or type done: `,
				)
			).trim();

			if (value === "" || value.toLowerCase() === "done") {
				return { kind: "explicit", ids: [...selected] };
			}

			const component = compatible.find((candidate) => candidate.id === value);

			if (component !== undefined) {
				if (required.has(component.id)) {
					process.stdout.write(
						`${component.id} is required and remains selected.\n`,
					);
				} else if (selected.has(component.id)) {
					selected.delete(component.id);
				} else {
					selected.add(component.id);
				}
				continue;
			}

			const category = compatible.filter(
				(candidate) => candidate.category === value,
			);

			if (category.length > 0) {
				const removable = category.filter(
					(candidate) => !required.has(candidate.id),
				);
				const allSelected = removable.every((candidate) =>
					selected.has(candidate.id),
				);

				for (const candidate of removable) {
					if (allSelected) {
						selected.delete(candidate.id);
					} else {
						selected.add(candidate.id);
					}
				}
				continue;
			}

			process.stdout.write(
				`Unknown component or category: ${value}. Nothing changed.\n`,
			);
		}
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

export async function promptForComponentDescription(): Promise<string> {
	const readline = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		return (
			await readline.question(
				"Description (what it does and when it should be used): ",
			)
		).trim();
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

function formatCategory(category: string): string {
	return category
		.split("/")
		.map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
		.join(" / ");
}
