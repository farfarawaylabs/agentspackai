---
title: "A pack version bump must update the pinned versions in two test files"
kind: "pitfall"
status: "active"
visibility: "shared"
applies_to:
  - "content/packs/core/pack.toml"
  - "tests/unit/render.test.ts"
  - "tests/integration/remote-pack-cli.test.ts"
tags:
  - "release"
  - "testing"
created_at: "2026-09-22"
updated_at: "2026-09-22"
created_by: "claude"
verified_at: "2026-09-22"
supersedes: []
superseded_by: null
---

Bumping `version` in `content/packs/core/pack.toml` also requires:

- `tests/unit/render.test.ts` — asserts the exact pack version, and asserts the
  complete list of rendered output paths, so any added or removed component
  file must be reflected there too.
- `tests/integration/remote-pack-cli.test.ts` — hard-codes the *next* version
  as a literal (`const nextVersion = "0.34.0"`). If it ever equals the current
  version, the test's artifact map collides and the remote-update test stops
  testing an update while still passing. Bump it past the new version.

Outside the CLI repo a release also touches `RELEASE_NOTES.md`,
`registry/v1/index.json`, and the web repo's catalog and release-notes pages.

## Evidence

- `tests/unit/render.test.ts` and `tests/integration/remote-pack-cli.test.ts`.
