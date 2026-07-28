import { describe, expect, test } from "bun:test";
import { join, resolve } from "node:path";
import {
	loadPackArtifact,
	serializePackArtifact,
} from "../../src/core/base-cache.ts";
import { loadPack } from "../../src/core/pack.ts";
import {
	loadOfficialPack,
	parsePackRegistry,
} from "../../src/core/registry.ts";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const PACK_V1 = join(PROJECT_ROOT, "fixtures/packs/0.1.0");

describe("pack artifacts", () => {
	test("round-trips an official pack with exact identity and files", async () => {
		const original = await loadPack(PACK_V1);
		const bytes = serializePackArtifact(original, { kind: "official" });
		const { pack } = loadPackArtifact(bytes, "test.pack");

		expect(pack.manifest.id).toBe(original.manifest.id);
		expect(pack.manifest.version).toBe(original.manifest.version);
		expect(pack.sha256).toBe(original.sha256);
		expect(pack.source.kind).toBe("official");
		expect(pack.files).toEqual(original.files);
	});

	test("rejects an artifact whose declared digest was changed", async () => {
		const original = await loadPack(PACK_V1);
		const value = JSON.parse(
			new TextDecoder().decode(
				serializePackArtifact(original, { kind: "official" }),
			),
		);
		value.pack.sha256 = `sha256:${"0".repeat(64)}`;

		expect(() =>
			loadPackArtifact(
				new TextEncoder().encode(JSON.stringify(value)),
				"tampered.pack",
			),
		).toThrow("digest or identity does not match");
	});
});

describe("official pack registry", () => {
	test("loads the latest matching release", async () => {
		const original = await loadPack(PACK_V1);
		const artifact = serializePackArtifact(original, { kind: "official" });
		const registry = validRegistry("https://example.com/pack.pack");
		const fetcher = (async (input: string | URL | Request) => {
			const url = String(input);

			return url.endsWith("registry.json")
				? Response.json(registry)
				: new Response(new TextDecoder().decode(artifact));
		}) as typeof fetch;
		const pack = await loadOfficialPack("agents-pack-smoke", {
			registryUrl: "https://example.com/registry.json",
			fetcher,
		});

		expect(pack.manifest.version).toBe("0.1.0");
		expect(pack.source.kind).toBe("official");
	});

	test("rejects malformed latest pointers and insecure remote URLs", () => {
		const missingLatest = validRegistry("https://example.com/pack.pack");
		const pack = missingLatest.packs["agents-pack-smoke"];

		if (pack === undefined) {
			throw new Error("Test registry is missing its fixture pack.");
		}

		pack.latest = "0.2.0";
		expect(() => parsePackRegistry(missingLatest)).toThrow(
			"latest version 0.2.0 is missing",
		);

		const insecure = validRegistry("http://example.com/pack.pack");
		expect(() => parsePackRegistry(insecure)).toThrow("must use HTTPS");
	});
});

function validRegistry(url: string): {
	schema_version: number;
	packs: Record<
		string,
		{
			latest: string;
			tag_prefix: string;
			versions: Record<string, { url: string }>;
		}
	>;
} {
	return {
		schema_version: 1,
		packs: {
			"agents-pack-smoke": {
				latest: "0.1.0",
				tag_prefix: "pack-smoke-v",
				versions: {
					"0.1.0": { url },
				},
			},
		},
	};
}
