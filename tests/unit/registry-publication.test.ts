import { expect, test } from "bun:test";
import {
	latestAssetUrls,
	registryReady,
} from "../../scripts/check-registry-ready.ts";
import cliRegistry from "../../registry/v1/cli.json";
import packRegistry from "../../registry/v1/index.json";

test("publication checks every current CLI artifact and the current pack", () => {
	const urls = latestAssetUrls(cliRegistry, packRegistry);
	expect(urls).toHaveLength(6);
	expect(urls.filter((url) => url.endsWith(".tar.gz"))).toHaveLength(4);
	expect(urls.some((url) => url.endsWith("-checksums.txt"))).toBe(true);
	expect(urls).toContain(
		packRegistry.packs["agents-pack-core"].versions["0.31.0"].url,
	);
});

test("publication waits for both release lines before advancing the shared registry", async () => {
	expect(
		await registryReady(["cli", "pack"], async () => new Response(null)),
	).toBe(true);
	expect(
		await registryReady(["cli", "pack"], async (url, init) => {
			expect(init.method).toBe("HEAD");
			return new Response(null, { status: url === "pack" ? 404 : 200 });
		}),
	).toBe(false);
});

test("publication surfaces network and server errors instead of treating them as unreleased assets", async () => {
	await expect(
		registryReady(["cli"], async () => new Response(null, { status: 503 })),
	).rejects.toThrow("503");
	await expect(
		registryReady(["cli"], async () => {
			throw new Error("Network unavailable");
		}),
	).rejects.toThrow("Network unavailable");
});
