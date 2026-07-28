import { describe, expect, test } from "bun:test";
import {
	cliArchiveName,
	parseCliReleaseRegistry,
	validateCliRelease,
} from "../../src/core/cli-release.ts";

describe("CLI release registry", () => {
	test("parses and validates a complete release", () => {
		const registry = parseCliReleaseRegistry(validRegistry(), "test registry");

		expect(registry.latest).toBe("0.1.0");
		expect(registry.tagPrefix).toBe("cli-v");
		expect(validateCliRelease(registry, "0.1.0", "cli-v0.1.0")).toEqual(
			requireFixtureRelease(registry),
		);
		expect(cliArchiveName("0.1.0", "darwin-arm64")).toBe(
			"agents-pack-0.1.0-darwin-arm64.tar.gz",
		);
	});

	test("rejects unsafe or incomplete registry entries", () => {
		const insecure = validRegistry();
		requireFixtureRelease(insecure).base_url = "http://example.test/cli-v0.1.0";
		expect(() => parseCliReleaseRegistry(insecure)).toThrow("HTTPS");

		const incomplete = validRegistry();
		delete requireFixtureRelease(incomplete).assets["linux-x64"];
		expect(() => parseCliReleaseRegistry(incomplete)).toThrow(
			"must contain exactly",
		);

		const wrongAsset = validRegistry();
		requireFixtureRelease(wrongAsset).assets["darwin-arm64"] = "other.tar.gz";
		expect(() => parseCliReleaseRegistry(wrongAsset)).toThrow(
			"must be agents-pack-0.1.0-darwin-arm64.tar.gz",
		);
	});

	test("requires package, registry, and tag versions to agree", () => {
		const registry = parseCliReleaseRegistry(validRegistry());

		expect(() => validateCliRelease(registry, "0.2.0")).toThrow(
			"does not contain version 0.2.0",
		);
		expect(() => validateCliRelease(registry, "0.1.0", "cli-v0.1.1")).toThrow(
			"does not match expected tag cli-v0.1.0",
		);
	});
});

function validRegistry(): {
	schema_version: number;
	latest: string;
	tag_prefix: string;
	versions: Record<
		string,
		{
			base_url: string;
			checksums: string;
			assets: Record<string, string>;
		}
	>;
} {
	return {
		schema_version: 1,
		latest: "0.1.0",
		tag_prefix: "cli-v",
		versions: {
			"0.1.0": {
				base_url:
					"https://github.com/farfarawaylabs/agentspackai/releases/download/cli-v0.1.0",
				checksums: "agents-pack-0.1.0-checksums.txt",
				assets: {
					"darwin-arm64": "agents-pack-0.1.0-darwin-arm64.tar.gz",
					"darwin-x64": "agents-pack-0.1.0-darwin-x64.tar.gz",
					"linux-arm64": "agents-pack-0.1.0-linux-arm64.tar.gz",
					"linux-x64": "agents-pack-0.1.0-linux-x64.tar.gz",
				},
			},
		},
	};
}

function requireFixtureRelease<T>(registry: {
	versions: Record<string, T>;
}): T {
	const release = registry.versions["0.1.0"];

	if (release === undefined) {
		throw new Error("CLI registry fixture is missing version 0.1.0.");
	}

	return release;
}
