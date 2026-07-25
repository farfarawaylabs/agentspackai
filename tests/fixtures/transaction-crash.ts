import { join, resolve } from "node:path";
import { loadPack } from "../../src/core/pack.ts";
import { planUpdate } from "../../src/core/plan.ts";
import { resolveScopePaths } from "../../src/core/paths.ts";
import { runMutation } from "../../src/filesystem/transaction.ts";

const repository = process.argv[2];
const userHome = process.argv[3];

if (repository === undefined || userHome === undefined) {
	throw new Error("Expected repository and user-home arguments.");
}

const context = { cwd: resolve(repository), userHome: resolve(userHome) };
const paths = await resolveScopePaths("repository", context);
const pack = await loadPack(
	join(import.meta.dir, "../../fixtures/packs/0.2.0"),
);

await runMutation({
	paths,
	command: "update",
	createPlan: () => planUpdate({ pack, context }),
	onEvent: (event) => {
		if (event.point === "after-operation" && event.operationIndex === 0) {
			process.exit(91);
		}
	},
});
