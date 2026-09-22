---
title: "ap-review-plan's files are not in the dev-flow skill directory"
kind: "pitfall"
status: "active"
visibility: "shared"
applies_to:
  - "content/packs/core/skills/engineering/workflows/planning/ap-review-plan"
  - "content/packs/core/pack.toml"
tags:
  - "dev-flow"
  - "pack-layout"
created_at: "2026-09-22"
updated_at: "2026-09-22"
created_by: "claude"
verified_at: "2026-09-22"
supersedes: []
superseded_by: null
---

`ap-review-plan` has manifest `category = "engineering/dev-flow"` but its
`source` is still `skills/engineering/workflows/planning/ap-review-plan`. The
category moved; the directory did not, deliberately, so the component keeps its
id and needs no retirement cycle.

A change that sweeps the dev-flow pipeline by directory
(`skills/engineering/dev-flow/*`) silently skips it. This actually happened: a
pass that reworded every stage skill from the literal `ap-dev-flow` to an
orchestrator-neutral phrasing missed `ap-review-plan`, which would have left
`ap-dev-flow-auto` unable to reach the reviewer's apply mode and looping to its
plan-review cap.

Sweep the pipeline by manifest category, or explicitly include the planning
path.

## Evidence

- `content/packs/core/pack.toml`, the `ap-review-plan` component.
