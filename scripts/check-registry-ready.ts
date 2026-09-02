import { readFile } from "node:fs/promises";
import { parseCliReleaseRegistry } from "../src/core/cli-release.ts";
import { parsePackRegistry } from "../src/core/registry.ts";

export function latestAssetUrls(
	cliValue: unknown,
	packValue: unknown,
): string[] {
	const cli = parseCliReleaseRegistry(cliValue);
	const packs = parsePackRegistry(packValue);
	const release = cli.versions[cli.latest];
	if (release === undefined) throw new Error("Missing latest CLI release.");
	return [
		...[release.checksums, ...Object.values(release.assets)].map(
			(name) => `${release.baseUrl}/${name}`,
		),
		...Object.values(packs.packs).map((pack) => {
			const entry = pack.versions[pack.latest];
			if (entry === undefined) throw new Error("Missing latest pack release.");
			return entry.url;
		}),
	];
}

export async function registryReady(
	urls: readonly string[],
	request: (url: string, init: RequestInit) => Promise<Response> = fetch,
): Promise<boolean> {
	const results = await Promise.all(
		urls.map(async (url) => {
			const response = await request(url, {
				method: "HEAD",
				redirect: "follow",
				signal: AbortSignal.timeout(30_000),
			});
			if (response.ok) return true;
			if (response.status === 404) return false;
			throw new Error(
				`Release asset check failed (${response.status}): ${url}`,
			);
		}),
	);
	return results.every(Boolean);
}

if (import.meta.main) {
	const urls = latestAssetUrls(
		JSON.parse(await readFile("registry/v1/cli.json", "utf8")),
		JSON.parse(await readFile("registry/v1/index.json", "utf8")),
	);
	const ready = await registryReady(urls);
	if (!ready) {
		console.error(
			"Registry publication deferred: a latest release asset is not public yet. The next release workflow will publish the shared registry; rerun this publication job if needed.",
		);
	}
	console.log(`ready=${ready}`);
}
