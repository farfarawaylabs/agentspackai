import { describe, expect, test } from "bun:test";
import {
	assertNoCommandArguments,
	parseArguments,
	parseComponentMutationArguments,
	parseCreateArguments,
	parseEjectArguments,
	parseForkArguments,
	parseInitArguments,
	parseListArguments,
	parseRollbackArguments,
	parseSyncArguments,
	parseUpdateArguments,
} from "../../src/cli/arguments.ts";

describe("parseArguments", () => {
	test("shows general help when no arguments are supplied", () => {
		expect(parseArguments([])).toEqual({
			help: true,
			rest: [],
		});
	});

	test("recognizes a command and its help flag", () => {
		expect(parseArguments(["update", "--help"])).toEqual({
			command: "update",
			help: true,
			rest: ["--help"],
		});
	});

	test("recognizes the global version flag", () => {
		expect(parseArguments(["--version"])).toEqual({
			help: false,
			version: true,
			rest: [],
		});
		expect(parseArguments(["-V"])).toEqual({
			help: false,
			version: true,
			rest: [],
		});
	});

	test("preserves command arguments for later phases", () => {
		expect(
			parseArguments([
				"init",
				"--scope",
				"repository",
				"--agents",
				"claude,codex",
			]),
		).toEqual({
			command: "init",
			help: false,
			rest: ["--scope", "repository", "--agents", "claude,codex"],
		});
	});

	test("reports an unknown command", () => {
		expect(parseArguments(["unknown"])).toEqual({
			help: false,
			rest: [],
			unknownCommand: "unknown",
		});
	});
});

describe("user component arguments", () => {
	test("parses create, fork, and sync options", () => {
		expect(
			parseCreateArguments([
				"subagent",
				"release-checker",
				"--description",
				"Review releases.",
				"--write",
				"--yes",
			]),
		).toEqual({
			kind: "subagent",
			name: "release-checker",
			description: "Review releases.",
			workspaceWrite: true,
			yes: true,
			dryRun: false,
		});
		expect(
			parseForkArguments(["ap-debug", "--name", "my-debug", "--dry-run"]),
		).toEqual({
			componentId: "ap-debug",
			name: "my-debug",
			yes: false,
			dryRun: true,
		});
		expect(parseSyncArguments(["--yes"])).toEqual({
			yes: true,
			dryRun: false,
		});
	});

	test("rejects invalid user component arguments", () => {
		expect(() => parseCreateArguments(["command", "test"])).toThrow(
			"skill or subagent",
		);
		expect(() => parseCreateArguments(["skill", "test", "--write"])).toThrow(
			"valid only for subagents",
		);
		expect(() => parseForkArguments(["ap-debug"])).toThrow(
			"requires an official component ID and --name",
		);
		expect(() => parseSyncArguments(["component"])).toThrow(
			"Unknown sync option",
		);
	});
});

describe("parseInitArguments", () => {
	test("parses the complete non-interactive command", () => {
		expect(
			parseInitArguments([
				"--scope",
				"repository",
				"--agents",
				"claude,codex",
				"--pack",
				"./pack",
				"--components",
				"recommended",
				"--yes",
				"--dry-run",
			]),
		).toEqual({
			scope: "repository",
			agents: ["claude", "codex"],
			packPath: "./pack",
			components: { kind: "recommended" },
			yes: true,
			dryRun: true,
		});
	});

	test("rejects unknown, duplicate, and missing option values", () => {
		expect(() => parseInitArguments(["--unknown"])).toThrow(
			"Unknown init option",
		);
		expect(() => parseInitArguments(["--agents", "claude,claude"])).toThrow(
			"Duplicate agent",
		);
		expect(() => parseInitArguments(["--scope"])).toThrow("requires a value");
	});

	test("rejects options on status", () => {
		expect(() => assertNoCommandArguments("status", ["--json"])).toThrow(
			"does not accept options",
		);
	});
});

describe("component arguments", () => {
	test("parses install, remove, and list options", () => {
		expect(
			parseComponentMutationArguments("install", [
				"ap-debug",
				"--yes",
				"--dry-run",
			]),
		).toEqual({
			componentId: "ap-debug",
			yes: true,
			dryRun: true,
		});
		expect(parseComponentMutationArguments("remove", ["ap-debug"])).toEqual({
			componentId: "ap-debug",
			yes: false,
			dryRun: false,
		});
		expect(parseListArguments(["--available", "--kind", "skill"])).toEqual({
			status: "available",
			kind: "skill",
		});
	});

	test("rejects missing IDs, duplicate flags, and conflicting filters", () => {
		expect(() => parseComponentMutationArguments("install", [])).toThrow(
			"requires a component ID",
		);
		expect(() =>
			parseComponentMutationArguments("remove", ["one", "two"]),
		).toThrow("exactly one");
		expect(() => parseListArguments(["--installed", "--available"])).toThrow(
			"cannot be combined",
		);
	});
});

describe("parseUpdateArguments", () => {
	test("parses pack, confirmation, and dry-run flags", () => {
		expect(
			parseUpdateArguments(["--pack", "./pack", "--yes", "--dry-run"]),
		).toEqual({
			packPath: "./pack",
			check: false,
			yes: true,
			dryRun: true,
		});
		expect(parseUpdateArguments(["--check", "--pack", "./pack"])).toEqual({
			packPath: "./pack",
			check: true,
			yes: false,
			dryRun: false,
		});
	});

	test("rejects unknown and duplicate options", () => {
		expect(() => parseUpdateArguments(["--scope", "repository"])).toThrow(
			"Unknown update option",
		);
		expect(() =>
			parseUpdateArguments(["--pack", "one", "--pack", "two"]),
		).toThrow("--pack may be provided only once");
		expect(() => parseUpdateArguments(["--check", "--yes"])).toThrow(
			"cannot be combined",
		);
	});
});

describe("version-control arguments", () => {
	test("parses rollback options", () => {
		expect(parseRollbackArguments(["0.1.0", "--yes"])).toEqual({
			version: "0.1.0",
			yes: true,
			dryRun: false,
		});
		expect(parseRollbackArguments(["--dry-run"])).toEqual({
			yes: false,
			dryRun: true,
		});
	});

	test("rejects invalid rollback options", () => {
		expect(() => parseRollbackArguments(["0.1.0", "0.2.0"])).toThrow(
			"at most one version",
		);
		expect(() => parseRollbackArguments(["--force"])).toThrow(
			"Unknown rollback option",
		);
	});
});

describe("parseEjectArguments", () => {
	test("parses confirmation and dry-run flags", () => {
		expect(parseEjectArguments(["--yes", "--dry-run"])).toEqual({
			yes: true,
			dryRun: true,
		});
	});

	test("rejects unknown and duplicate flags", () => {
		expect(() => parseEjectArguments(["--force"])).toThrow(
			"Unknown eject option",
		);
		expect(() => parseEjectArguments(["--yes", "--yes"])).toThrow(
			"--yes may be provided only once",
		);
	});
});
