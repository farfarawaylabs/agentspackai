---
status: draft
mode: interactive
based_on_research: 01-research.md
open_questions_carried: false
---

# Plan: <one-line goal>

## Summary

<Two or three plain sentences: what this change does and why. Written for a
reader who has not seen the research.>

**What changes:** <files or areas, in plain words>. <N> tasks in <M> phases.

**Decisions to approve**

- <A decision the reader is agreeing to, with a one-line reason.>

**Not included:** <what is deliberately left out>.

**Risks and open questions:** <anything that could change the plan, with the
assumption taken and how it will be learned>, or "None".

## Done when

- <An observable result a person or CI can check.>

## Approach

<A short paragraph: where the change goes and which existing code it reuses.
State facts in words, then cite the evidence in parentheses, for example
"The existing lookup matches any option when given no name (research F2)".>

## Phase 1 — <name>

**Phase verify:** `<command>`

### Task 1 — <title>

- phase: 1
- parallel: no
- intent: <Two or three sentences describing the behavior to build, not the
  code. Restate any decision that constrains this task, because the
  implementer sees only this task.>
- tests:
  - <one case per bullet>
- files: `path/a.ts`, `path/b.ts`
- verify: `<command>`

### Task 2 — <title>

- phase: 1
- parallel: after:[1]
- intent: …
- tests:
  - …
- files: …
- verify: `<command>`

## Decisions

- <Current decision> — <one-line reason>.

## Acceptance checks

- <Short name>: `<command>`
