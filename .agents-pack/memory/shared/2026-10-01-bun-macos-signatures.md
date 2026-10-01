---
title: "Bun-compiled macOS binaries need codesign re-signing and strict verification"
kind: "pitfall"
status: "active"
visibility: "shared"
applies_to:
  - ".github/workflows/release-cli.yml"
  - "scripts/build-cli.ts"
  - "docs/agent-portability/agents-pack-cli-distribution.md"
tags:
  - "release"
  - "macos"
  - "code-signing"
  - "bun"
created_at: "2026-10-01"
updated_at: "2026-10-01"
created_by: "claude"
verified_at: "2026-10-01"
supersedes: []
superseded_by: null
---

`bun build --compile` output for macOS is not trustworthy as signed:

- Bun before 1.4.1 writes one wrong page hash in every `darwin-arm64` build.
- Even Bun 1.4.2 leaves `darwin-x64` with Bun's invalidated Developer ID
  signature.

macOS 27 kills either on launch (`Killed: 9`), and CLI 0.1.0–0.3.1 shipped
like this. Keep the release workflow's `codesign --force --sign -` plus
`codesign --verify --strict` step for every macOS target. Running the binary
on macOS 26 or earlier is not proof: it still runs some invalid signatures.

Diagnose with `codesign --verify --strict <binary>` and the crash report in
`~/Library/Logs/DiagnosticReports/` (look for `namespace: CODESIGNING`).

## Evidence

- Rationale and alternatives: `docs/agent-portability/agents-pack-cli-distribution.md`,
  section "macOS code signatures".
- Upstream: https://github.com/oven-sh/bun/issues/32159 and
  https://github.com/oven-sh/bun/pull/39837.
