import { AgentsPackError } from "./errors.ts";
import type { AgentTarget, PackComponent, PackManifest } from "./types.ts";

export type ComponentChoice =
	| { kind: "recommended" }
	| { kind: "all" }
	| { kind: "explicit"; ids: string[] };

export function expandComponentChoice(
	manifest: PackManifest,
	targets: readonly AgentTarget[],
	choice: ComponentChoice,
): string[] {
	const compatible = manifest.components.filter((component) =>
		isCompatible(component, targets),
	);

	switch (choice.kind) {
		case "recommended":
			return compatible
				.filter((component) => component.selection !== "optional")
				.map((component) => component.id);
		case "all":
			return compatible.map((component) => component.id);
		case "explicit":
			return resolveComponentSelection(
				manifest.components,
				targets,
				choice.ids,
			).map((component) => component.id);
	}
}

export function resolveComponentSelection(
	components: readonly PackComponent[],
	targets: readonly AgentTarget[],
	componentIds: readonly string[],
): PackComponent[] {
	const selectedTargets = new Set(targets);
	const requested = new Set(componentIds);

	if (requested.size !== componentIds.length) {
		throw new AgentsPackError(
			"USAGE",
			"Component selection must not contain duplicates.",
		);
	}

	const byId = new Map(
		components.map((component) => [component.id, component]),
	);

	for (const id of requested) {
		const component = byId.get(id);

		if (component === undefined) {
			throw new AgentsPackError(
				"UNKNOWN_COMPONENT",
				`Unknown component: ${id}`,
			);
		}

		if (!isCompatible(component, targets)) {
			throw new AgentsPackError(
				"INCOMPATIBLE_COMPONENT",
				`Component ${id} does not support any selected agent.`,
			);
		}
	}

	for (const component of components) {
		if (
			component.selection === "required" &&
			isCompatible(component, targets)
		) {
			requested.add(component.id);
		}
	}

	if (selectedTargets.size === 0) {
		throw new AgentsPackError(
			"USAGE",
			"At least one agent target must be selected.",
		);
	}

	return components.filter((component) => requested.has(component.id));
}

export function isCompatible(
	component: PackComponent,
	targets: readonly AgentTarget[],
): boolean {
	return component.targets.some((target) => targets.includes(target));
}

export function findNewComponents(
	previous: PackManifest,
	candidate: PackManifest,
	targets: readonly AgentTarget[],
): PackComponent[] {
	const known = new Set(previous.components.map((component) => component.id));
	return sortComponentsForDisplay(
		candidate.components.filter(
			(component) =>
				!known.has(component.id) && isCompatible(component, targets),
		),
	);
}

export function sortComponentsForDisplay(
	components: readonly PackComponent[],
): PackComponent[] {
	return [...components].sort((left, right) => {
		const category = left.category.localeCompare(right.category);

		if (category !== 0) {
			return category;
		}

		const title = left.title.localeCompare(right.title);
		return title !== 0 ? title : left.id.localeCompare(right.id);
	});
}
