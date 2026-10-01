---
title: "Tests that snapshot a fake HOME must disable Bun's transpiler cache"
kind: "pitfall"
status: "active"
visibility: "shared"
applies_to:
  - "tests/integration/cli-init-status.test.ts"
  - "tests/integration/version-control-cli.test.ts"
tags:
  - "testing"
  - "bun"
created_at: "2026-10-01"
updated_at: "2026-10-01"
created_by: "claude"
verified_at: "2026-10-01"
supersedes: []
superseded_by: null
---

From Bun 1.4, running the CLI from source (`bun src/cli/main.ts`) writes a
transpiler cache to `$HOME/Library/Caches/bun/@t@/*.pile` on macOS. A test that
points `HOME` at a temporary directory and asserts the CLI wrote nothing there
will fail, or pass only because an earlier run in the same test already warmed
the cache. Set `BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0"` in that test's spawn
environment.

The compiled release binary does not write this cache, so it is not a CLI
behavior change.

## Evidence

- `runCli` helpers in the two files above; the other CLI-spawning helpers do not
  snapshot `HOME` and were left unchanged.
