import {
	cancel as cancelPrompt,
	confirm,
	groupMultiselect,
	isCancel,
	multiselect,
	select,
	text,
} from "@clack/prompts";
import { AgentsPackError } from "../core/errors.ts";
import {
	expandComponentChoice,
	isCompatible,
	sortComponentsForDisplay,
	type ComponentChoice,
} from "../core/selection.ts";
import type {
	AgentTarget,
	LoadedPack,
	PackComponent,
	Scope,
} from "../core/types.ts";
import type { InitArguments } from "./arguments.ts";

export async function promptForInitArguments(
	partial: InitArguments,
): Promise<InitArguments> {
	const scope =
		partial.scope ??
		unwrapPrompt(
			await select<Scope>({
				message: "Where should Agents Pack be initialized?",
				options: [
					{
						value: "repository",
						label: "Repository",
						hint: "this project (recommended)",
					},
					{
						value: "global",
						label: "Global",
						hint: "your user account",
					},
				],
				initialValue: "repository",
			}),
		);
	const availableAgents: AgentTarget[] =
		scope === "global" ? ["claude", "codex"] : ["claude", "codex", "cursor"];
	const agents =
		partial.agents ??
		unwrapPrompt(
			await multiselect<AgentTarget>({
				message: "Which agents should Agents Pack configure?",
				options: [
					{ value: "claude", label: "Claude Code" },
					{ value: "codex", label: "Codex" },
					{
						value: "cursor",
						label: "Cursor",
						...(scope === "global"
							? {
									disabled: true,
									hint: "repository scope only",
								}
							: {}),
					},
				],
				initialValues: availableAgents,
				required: true,
			}),
		);

	return {
		...partial,
		scope,
		agents,
	};
}

export async function promptForComponentChoice(
	pack: LoadedPack,
	targets: readonly AgentTarget[],
): Promise<ComponentChoice> {
	const compatible = sortComponentsForDisplay(
		pack.manifest.components.filter((component) =>
			isCompatible(component, targets),
		),
	);
	const recommended = new Set(
		expandComponentChoice(pack.manifest, targets, { kind: "recommended" }),
	);
	const mode = unwrapPrompt(
		await select<"recommended" | "all" | "custom">({
			message: "Which components should be installed?",
			options: [
				{
					value: "recommended",
					label: "Recommended",
					hint: "required and recommended, then choose optional categories",
				},
				{
					value: "all",
					label: "All",
					hint: "every compatible component",
				},
				{
					value: "custom",
					label: "Custom",
					hint: "choose categories or individual components",
				},
			],
			initialValue: "recommended",
		}),
	);

	if (mode === "all") {
		return { kind: "all" };
	}

	const required = new Set(
		compatible
			.filter((component) => component.selection === "required")
			.map((component) => component.id),
	);
	const selectable = compatible.filter((component) =>
		mode === "recommended"
			? component.selection === "optional"
			: component.selection !== "required",
	);
	const selected = new Set(
		await promptForGroupedComponents(
			selectable,
			mode === "recommended"
				? "Add optional categories or components (leave empty to keep Recommended)"
				: "Select categories or components (required components are always included)",
			mode === "custom"
				? selectable
						.filter((component) => recommended.has(component.id))
						.map((component) => component.id)
				: [],
		),
	);
	const included = mode === "recommended" ? recommended : required;

	return {
		kind: "explicit",
		ids: compatible
			.map((component) => component.id)
			.filter((id) => included.has(id) || selected.has(id)),
	};
}

export async function promptForNewComponents(
	components: readonly PackComponent[],
): Promise<string[]> {
	return promptForGroupedComponents(
		components.filter((component) => component.selection !== "required"),
		"Add new categories or components from this update (leave empty to skip)",
		[],
	);
}

async function promptForGroupedComponents(
	components: readonly PackComponent[],
	message: string,
	initialValues: string[],
): Promise<string[]> {
	if (components.length === 0) return [];
	const groups = new Map<
		string,
		{ value: string; label: string; hint: string }[]
	>();
	for (const component of sortComponentsForDisplay(components)) {
		const label = formatCategory(component.category);
		const options = groups.get(label) ?? [];
		options.push({
			value: component.id,
			label: component.title,
			hint: `${component.kind} · ${component.id} · ${component.selection} · ${component.summary}`,
		});
		groups.set(label, options);
	}
	return unwrapPrompt(
		await groupMultiselect<string>({
			message,
			options: Object.fromEntries(groups),
			initialValues,
			selectableGroups: true,
			required: false,
		}),
	);
}

export async function confirmApply(): Promise<boolean> {
	return unwrapPrompt(
		await confirm({
			message: "Apply this plan?",
			initialValue: false,
		}),
	);
}

export async function promptForPackPath(): Promise<string> {
	return unwrapPrompt(
		await text({
			message: "Local pack path",
			validate: (value) =>
				value === undefined || value.trim() === ""
					? "A local pack path is required."
					: undefined,
		}),
	).trim();
}

export async function promptForComponentDescription(): Promise<string> {
	return unwrapPrompt(
		await text({
			message: "Description (what it does and when it should be used)",
		}),
	).trim();
}

function formatCategory(category: string): string {
	return category
		.split("/")
		.map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
		.join(" / ");
}

function unwrapPrompt<Value>(value: Value | symbol): Value {
	if (isCancel(value)) {
		cancelPrompt("Cancelled. No files changed.");
		throw new AgentsPackError("CANCELLED", "Cancelled.", { exitCode: 0 });
	}

	return value;
}
