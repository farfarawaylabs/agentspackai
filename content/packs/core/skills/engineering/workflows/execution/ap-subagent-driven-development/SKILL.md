---
name: ap-subagent-driven-development
description: Retired. Replaced by ap-dev-implement (plan execution) and ap-dev-flow (the full pipeline). Use only when the user explicitly invokes ap-subagent-driven-development; then hand off to ap-dev-implement.
---

# Subagent-driven development (retired)

This skill has been replaced and will be removed in a later Agents Pack
version.

- To execute an existing plan task by task with fresh implementers and
  independent reviews, use `ap-dev-implement`. It keeps this skill's authority
  rules, task loop, and repair ladder, and records its work in a run folder.
- To go from a goal through research, planning, plan review, implementation,
  code review, and verification, use `ap-dev-flow`.

When the user invokes this skill, tell them it is retired and continue with
`ap-dev-implement`, passing along their plan and instructions. If
`ap-dev-implement` is not installed, report that exact component id and offer
the normal Agents Pack install workflow; do not run the old workflow from
memory.
