---
title: "Deleting the retired SDD component waits for pack 0.34.0"
kind: "decision"
status: "active"
visibility: "shared"
applies_to:
  - "content/packs/core/pack.toml"
tags:
  - "release"
  - "deprecation"
created_at: "2026-09-22"
updated_at: "2026-09-22"
created_by: "claude"
verified_at: "2026-09-22"
supersedes: []
superseded_by: null
---

`ap-subagent-driven-development` stays in pack 0.33.0 as a retired pointer to
`ap-dev-implement`. Deleting its directory and manifest entry is deferred to
0.34.0 or later.

The spec's gate ("at least one CLI release cycle after the removal-tolerant
update ships") is technically met, since CLI 0.3.1 is published. It was still
deferred: 0.3.1 shipped only days before 0.33.0, and anyone still on an older
CLI with SDD selected gets a hard `UNKNOWN_COMPONENT` failure on
`agents-pack update`. Keeping 0.33.0 purely additive also keeps one release
from carrying two independent risks.

The removal release's notes must lead with "update the CLI to 0.3.1+ first".

## Evidence

- `content/packs/core/pack.toml`, the retired `ap-subagent-driven-development`
  component; `content/packs/core/RELEASE_NOTES.md`, "Still to come".
