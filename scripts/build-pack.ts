#!/usr/bin/env bun

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { serializePackArtifact } from "../src/core/base-cache.ts";
import { AgentsPackError } from "../src/core/errors.ts";
import { loadPack } from "../src/core/pack.ts";
import { parsePackRegistry } from "../src/core/registry.ts";

interface BuildOptions {
	packRoot: string;
	outputPath?: string;
	registryPath?: string;
	tag?: string;
}

const options = parseArguments(process.argv.slice(2));
const pack = await loadPack(options.packRoot);
const outputPath =
	options.outputPath ??
	resolve("dist/packs", `${pack.manifest.id}-${pack.manifest.version}.pack`);

if (options.registryPath !== undefined) {
	const registry = parsePackRegistry(
		JSON.parse(await readFile(options.registryPath, "utf8")),
		options.registryPath,
	);
	const entry = registry.packs[pack.manifest.id];

	if (entry === undefined) {
		throw new AgentsPackError(
			"INVALID_PACK",
			`Registry does not contain ${pack.manifest.id}.`,
		);
	}

	if (entry.latest !== pack.manifest.version) {
		throw new AgentsPackError(
			"INVALID_PACK",
			`Registry latest ${entry.latest} does not match pack version ${pack.manifest.version}.`,
		);
	}

	if (options.tag !== undefined) {
		const expectedTag = `${entry.tagPrefix}${pack.manifest.version}`;

		if (options.tag !== expectedTag) {
			throw new AgentsPackError(
				"INVALID_PACK",
				`Release tag ${options.tag} does not match expected tag ${expectedTag}.`,
			);
		}
	}

	const release = entry.versions[pack.manifest.version];
	const expectedAsset = `${pack.manifest.id}-${pack.manifest.version}.pack`;

	if (
		release === undefined ||
		!new URL(release.url).pathname.endsWith(
			`/${entry.tagPrefix}${pack.manifest.version}/${expectedAsset}`,
		)
	) {
		throw new AgentsPackError(
			"INVALID_PACK",
			`Registry release URL does not match ${expectedAsset}.`,
		);
	}
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, serializePackArtifact(pack, { kind: "official" }), {
	mode: 0o644,
});
process.stdout.write(`${outputPath}\n`);

function parseArguments(args: readonly string[]): BuildOptions {
	let packRoot = resolve("content/packs/core");
	let outputPath: string | undefined;
	let registryPath: string | undefined;
	let tag: string | undefined;

	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];

		if (argument === "--") {
			continue;
		}

		const value = args[index + 1];

		if (
			argument !== "--pack" &&
			argument !== "--output" &&
			argument !== "--registry" &&
			argument !== "--tag"
		) {
			throw new Error(`Unknown pack build option: ${argument ?? ""}`);
		}

		if (value === undefined || value.startsWith("--")) {
			throw new Error(`${argument} requires a value.`);
		}

		if (argument === "--pack") {
			packRoot = resolve(value);
		} else if (argument === "--output") {
			outputPath = resolve(value);
		} else if (argument === "--registry") {
			registryPath = resolve(value);
		} else {
			tag = value;
		}

		index += 1;
	}

	return {
		packRoot,
		...(outputPath === undefined ? {} : { outputPath }),
		...(registryPath === undefined ? {} : { registryPath }),
		...(tag === undefined ? {} : { tag }),
	};
}
