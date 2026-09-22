---
title: "Auto mode always continues when the plan hash changed mid-run"
kind: "decision"
status: "active"
visibility: "shared"
applies_to:
  - "content/packs/core/skills/engineering/dev-flow/ap-dev-implement"
tags:
  - "dev-flow"
  - "auto-mode"
created_at: "2026-09-22"
updated_at: "2026-09-22"
created_by: "claude"
verified_at: "2026-09-22"
supersedes: []
superseded_by: null
---

When `ap-dev-implement` resumes and `02-plan.md`'s hash no longer matches the
one recorded at preflight, `mode: auto` re-runs the preflight against the
current plan, records a `Ruling:`, and continues. It never stops.

The user was offered a narrower rule (continue when no task is complete, stop
when work was already committed against the old plan) and explicitly rejected
stopping. The residual risk is real and accepted: tasks already committed may
not match the plan the remaining tasks follow, and nothing is watching. The
ruling is surfaced in the pull request body so a human reviewer sees it.

Interactive mode still stops and asks. Do not "fix" auto to stop without asking
the user first.

## Evidence

- `skills/engineering/dev-flow/ap-dev-implement/SKILL.md`, "Keep the ledger".
