import { describe, expect, test } from "bun:test";
import { compareVersions } from "../../src/core/versions.ts";

describe("compareVersions", () => {
	test("orders stable semantic versions numerically", () => {
		expect(compareVersions("0.10.0", "0.9.0")).toBe(1);
		expect(compareVersions("2.0.0", "10.0.0")).toBe(-1);
		expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
	});

	test("orders prereleases before stable releases", () => {
		expect(compareVersions("1.0.0-beta.2", "1.0.0-beta.10")).toBe(-1);
		expect(compareVersions("1.0.0-beta.1", "1.0.0")).toBe(-1);
	});

	test("rejects non-semantic pack versions", () => {
		expect(() => compareVersions("latest", "1.0.0")).toThrow(
			"must use semantic versioning",
		);
	});
});
