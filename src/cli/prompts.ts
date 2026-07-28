import {
	cancel as cancelPrompt,
	confirm,
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
import type { AgentTarget, LoadedPack, Scope } from "../core/types.ts";
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
					hint: "required and recommended components",
				},
				{
					value: "all",
					label: "All",
					hint: "every compatible component",
				},
				{
					value: "custom",
					label: "Custom",
					hint: "choose components individually",
				},
			],
			initialValue: "recommended",
		}),
	);

	if (mode !== "custom") {
		return { kind: mode };
	}

	const required = new Set(
		compatible
			.filter((component) => component.selection === "required")
			.map((component) => component.id),
	);
	const selected = new Set(
		unwrapPrompt(
			await multiselect<string>({
				message: "Select components",
				options: compatible.map((component) => {
					const marker =
						component.selection === "required"
							? "required"
							: recommended.has(component.id)
								? "recommended"
								: "optional";

					return {
						value: component.id,
						label: component.id,
						hint: `${marker} · ${formatCategory(component.category)} · ${component.summary}`,
						disabled: required.has(component.id),
					};
				}),
				initialValues: compatible
					.filter(
						(component) =>
							recommended.has(component.id) && !required.has(component.id),
					)
					.map((component) => component.id),
				required: false,
			}),
		),
	);

	return {
		kind: "explicit",
		ids: compatible
			.map((component) => component.id)
			.filter((id) => required.has(id) || selected.has(id)),
	};
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
