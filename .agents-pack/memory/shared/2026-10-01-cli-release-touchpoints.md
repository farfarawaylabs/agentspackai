---
title: "A CLI release touches four files here and three in the web repo"
kind: "workflow"
status: "active"
visibility: "shared"
applies_to:
  - "package.json"
  - "registry/v1/cli.json"
  - "CLI_RELEASE_NOTES.md"
  - "tests/unit/cli-help.test.ts"
tags:
  - "release"
  - "cli"
  - "docs-site"
created_at: "2026-10-01"
updated_at: "2026-10-01"
created_by: "claude"
verified_at: "2026-10-01"
supersedes: []
superseded_by: null
---

In this repo, bump the version in all four:

- `package.json`;
- `registry/v1/cli.json` (new version entry plus `latest`);
- `CLI_RELEASE_NOTES.md` (replaced wholesale; it becomes the GitHub release
  body); and
- the exact version string in `tests/unit/cli-help.test.ts`.

Merge the PR, then tag the merge commit `cli-vX.Y.Z`. The tag workflow
publishes the release and the registry.

In the docs site (`farfarawaylabs/agentspackai-web`), add:

- a page at `src/content/docs/release-notes/cli-X-Y-Z.md`;
- the current-version row and releases-list entry in `release-notes/index.md`;
  and
- a sidebar entry in `astro.config.mjs`.

The sidebar is manual and easy to miss: the Core 0.33.0 page shipped without
one. Deploy only after the release workflow succeeds. There is no CI deploy:
run `npm run deploy` (Wrangler), then check `https://agentspackai.com`.

## Evidence

- CLI 0.3.2: farfarawaylabs/agentspackai#26 and tag `cli-v0.3.2`;
  docs farfarawaylabs/agentspackai-web#13.
