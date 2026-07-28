import { homedir } from "node:os";
import { resolve } from "node:path";
import { parseListArguments } from "../cli/arguments.ts";
import { loadCachedPack } from "../core/base-cache.ts";
import { AgentsPackError } from "../core/errors.ts";
import { detectInstalledScope } from "../core/inspect.ts";
import { isCompatible, sortComponentsForDisplay } from "../core/selection.ts";
import type { PathContext } from "../core/types.ts";
import { loadUserPack } from "../core/user-components.ts";

export interface ListCommandDependencies {
	cwd?: string;
	userHome?: string;
	write?: (text: string) => void;
}

export async function runList(
	args: readonly string[],
	dependencies: ListCommandDependencies = {},
): Promise<void> {
	const context: PathContext = {
		cwd: resolve(dependencies.cwd ?? process.cwd()),
		userHome: resolve(dependencies.userHome ?? homedir()),
	};
	const options = parseListArguments(args);
	const state = await detectInstalledScope(context);

	if (state.status !== "installed") {
		throw new AgentsPackError(
			"NOT_INITIALIZED",
			"Agents Pack is not initialized.",
		);
	}

	const pack = await loadCachedPack(context.userHome, state.lock.pack.sha256);
	const userPack = await loadUserPack(state.paths);
	const selected = new Set(state.config.components);
	const components = sortComponentsForDisplay(
		pack.manifest.components.filter((component) => {
			const installed = selected.has(component.id);
			const compatible = isCompatible(component, state.config.targets);

			if (options.status === "installed" && !installed) {
				return false;
			}

			if (options.status === "available" && (installed || !compatible)) {
				return false;
			}

			return options.kind === undefined || component.kind === options.kind;
		}),
	);
	const lines = [
		"Agents Pack components",
		"",
		`Pack: ${pack.manifest.id}@${pack.manifest.version}`,
		`Agents: ${state.config.targets.join(", ")}`,
	];
	let category = "";

	for (const component of components) {
		if (component.category !== category) {
			category = component.category;
			lines.push("", formatCategory(category));
		}

		const installation = selected.has(component.id)
			? "installed"
			: isCompatible(component, state.config.targets)
				? "available"
				: "incompatible";
		lines.push(
			`  ${component.id}  ${installation}, ${component.selection}, ${component.kind}`,
			`    ${component.summary}`,
		);
	}

	const userComponents =
		options.status === "available"
			? []
			: sortComponentsForDisplay(
					(userPack?.manifest.components ?? []).filter(
						(component) =>
							options.kind === undefined || component.kind === options.kind,
					),
				);

	for (const component of userComponents) {
		if (component.category !== category) {
			category = component.category;
			lines.push("", formatCategory(category));
		}

		lines.push(
			`  ${component.id}  user-owned, installed, ${component.kind}`,
			`    ${component.summary}`,
		);
	}

	if (components.length === 0 && userComponents.length === 0) {
		lines.push("", "No components match these filters.");
	}

	(dependencies.write ?? ((text: string) => process.stdout.write(text)))(
		`${lines.join("\n")}\n`,
	);
}

function formatCategory(category: string): string {
	return category
		.split("/")
		.map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
		.join(" / ");
}
