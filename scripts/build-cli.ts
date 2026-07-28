#!/usr/bin/env bun

import { chmod, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import packageMetadata from "../package.json" with { type: "json" };
import {
	isCliReleaseTarget,
	parseCliReleaseRegistry,
	validateCliRelease,
	type CliReleaseTarget,
} from "../src/core/cli-release.ts";

interface BuildOptions {
	target: CliReleaseTarget;
	outputPath: string;
	registryPath: string;
	tag?: string;
	validateOnly: boolean;
}

const COMPILE_TARGETS = {
	"darwin-arm64": "bun-darwin-arm64",
	"darwin-x64": "bun-darwin-x64",
	"linux-arm64": "bun-linux-arm64",
	"linux-x64": "bun-linux-x64-baseline",
} as const satisfies Record<CliReleaseTarget, string>;

const options = parseArguments(process.argv.slice(2));
const registry = parseCliReleaseRegistry(
	JSON.parse(await readFile(options.registryPath, "utf8")),
	options.registryPath,
);
validateCliRelease(registry, packageMetadata.version, options.tag);

if (options.validateOnly) {
	process.stdout.write(
		`Validated Agents Pack CLI ${packageMetadata.version} release metadata.\n`,
	);
	process.exit(0);
}

await mkdir(dirname(options.outputPath), { recursive: true });
const result = await Bun.build({
	entrypoints: [resolve("src/cli/main.ts")],
	compile: {
		target: COMPILE_TARGETS[options.target],
		outfile: options.outputPath,
		autoloadDotenv: false,
		autoloadBunfig: false,
	},
	minify: true,
});

if (!result.success) {
	for (const log of result.logs) {
		console.error(log);
	}

	throw new Error(`Failed to compile Agents Pack for ${options.target}.`);
}

await chmod(options.outputPath, 0o755);
process.stdout.write(`${options.outputPath}\n`);

function parseArguments(args: readonly string[]): BuildOptions {
	let target: CliReleaseTarget | undefined;
	let outputPath: string | undefined;
	let registryPath = resolve("registry/v1/cli.json");
	let tag: string | undefined;
	let validateOnly = false;

	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];

		if (argument === "--") {
			continue;
		}

		if (argument === "--validate-only") {
			validateOnly = true;
			continue;
		}

		const value = args[index + 1];

		if (
			argument !== "--target" &&
			argument !== "--output" &&
			argument !== "--registry" &&
			argument !== "--tag"
		) {
			throw new Error(`Unknown CLI build option: ${argument ?? ""}`);
		}

		if (value === undefined || value.startsWith("--")) {
			throw new Error(`${argument} requires a value.`);
		}

		if (argument === "--target") {
			if (!isCliReleaseTarget(value)) {
				throw new Error(`Unsupported CLI release target: ${value}`);
			}

			target = value;
		} else if (argument === "--output") {
			outputPath = resolve(value);
		} else if (argument === "--registry") {
			registryPath = resolve(value);
		} else {
			tag = value;
		}

		index += 1;
	}

	const selectedTarget = target ?? hostReleaseTarget();

	return {
		target: selectedTarget,
		outputPath:
			outputPath ?? resolve("dist/cli", selectedTarget, "agents-pack"),
		registryPath,
		...(tag === undefined ? {} : { tag }),
		validateOnly,
	};
}

function hostReleaseTarget(): CliReleaseTarget {
	const os =
		process.platform === "darwin"
			? "darwin"
			: process.platform === "linux"
				? "linux"
				: undefined;
	const architecture =
		process.arch === "arm64"
			? "arm64"
			: process.arch === "x64"
				? "x64"
				: undefined;
	const target =
		os === undefined || architecture === undefined
			? undefined
			: `${os}-${architecture}`;

	if (target === undefined || !isCliReleaseTarget(target)) {
		throw new Error(
			`This host cannot select a default CLI target: ${process.platform}-${process.arch}`,
		);
	}

	return target;
}
