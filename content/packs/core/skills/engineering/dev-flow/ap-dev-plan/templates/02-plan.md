---
status: draft
# status: draft | in_review | ready_with_changes | ready | approved | executing | done
mode: interactive
# mode: interactive | auto
based_on_research: 01-research.md
open_questions_carried: false
---

# Plan

## Purpose / done-when

Observable done-when (what a human or CI can check).

## Open questions / risks

Carry from research.

- Q1 (defer_until_implement): … — hypothesis: … — learn via: …

## Assumptions

- A1 — … (from F1)
- A2 — … (`UNVERIFIED`)

## Out of scope

- …

## Architecture

Short: approach, main modules, boundaries. No novel claims without research evidence.

## Phase 1 — <name>

**Phase verify:** `<command>`

### Task 1 — <title>

- phase: 1
- parallel: yes | no | after:[]
- intent: What to implement (not the full code)
- files: `path/a.ts`, `path/b.ts`
- verify: `<command>`

### Task 2 — <title>

- phase: 1
- parallel: no
- intent: …
- files: …
- verify: `<command>`

## Phase 2 — <name>

**Phase verify:** `<command>`

### Task 3 — <title>

- phase: 2
- parallel: yes
- intent: …
- files: …
- verify: `<command>`

<!-- Machine ids are flat Task N (not Task 2.3). Headings must match:
     ^#+\s+Task\s+N(\s|:|\.\s|$)
     Example valid: ### Task 3 — Title
-->

## Progress

- [ ] Task 1
- [ ] Task 2
- [ ] Phase 1 verify
- [ ] Task 3
- [ ] Phase 2 verify

## Decision log / surprises

<!-- Before implement only. During implement the plan is immutable; corrections
     go to 04-implementation-ledger.md. -->

## Acceptance commands

- [ ] `<command>`
