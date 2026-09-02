#!/usr/bin/env node

import { randomBytes } from "node:crypto";

const rawCount = process.argv[2] ?? "3";
const count = Number.parseInt(rawCount, 10);

if (!Number.isInteger(count) || count < 1 || count > 100) {
	console.error("Usage: node scripts/generate-seeds.mjs [count: 1-100]");
	process.exit(1);
}

const seeds = Array.from({ length: count }, (_, index) => ({
	index: index + 1,
	seed: randomBytes(16).toString("hex"),
}));

process.stdout.write(`${JSON.stringify(seeds, null, 2)}\n`);
