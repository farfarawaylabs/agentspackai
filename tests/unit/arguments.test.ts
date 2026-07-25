import { describe, expect, test } from "bun:test";
import {
	assertNoCommandArguments,
	parseArguments,
	parseEjectArguments,
	parseInitArguments,
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
		expect(parseArguments(["install"])).toEqual({
			help: false,
			rest: [],
			unknownCommand: "install",
		});
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
				"--yes",
				"--dry-run",
			]),
		).toEqual({
			scope: "repository",
			agents: ["claude", "codex"],
			packPath: "./pack",
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

describe("parseUpdateArguments", () => {
	test("parses pack, confirmation, and dry-run flags", () => {
		expect(
			parseUpdateArguments(["--pack", "./pack", "--yes", "--dry-run"]),
		).toEqual({
			packPath: "./pack",
			yes: true,
			dryRun: true,
		});
	});

	test("rejects unknown and duplicate options", () => {
		expect(() => parseUpdateArguments(["--scope", "repository"])).toThrow(
			"Unknown update option",
		);
		expect(() =>
			parseUpdateArguments(["--pack", "one", "--pack", "two"]),
		).toThrow("--pack may be provided only once");
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
