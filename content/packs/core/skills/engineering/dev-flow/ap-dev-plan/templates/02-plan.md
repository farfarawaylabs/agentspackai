---
status: draft
mode: interactive
based_on_research: 01-research.md
open_questions_carried: false
---

# Plan: <one-line goal>

## Summary

<Two or three plain sentences: what this change does and why, with a concrete
example of the new behavior. Written for a reader who has not seen the
research.>

**What changes:** <files or areas, in plain words>. <N> tasks in <M> phases.

## Decisions

<The choices this plan commits to, in plain language. One or two lines each,
with the reason. This is what the reader approves; consequences and edge
cases belong to the task that implements them.>

- <Decision> — <reason>.

## Scope

**Not included:** <what is deliberately left out>.

**Risks and open questions:** <what could change the plan, the assumption
taken, and how it will be learned>, or "None".

## Global constraints

<Rules that bind every task, copied verbatim from the specification, the
repository's instructions, or the decisions above. The controller passes
these to every implementer and reviewer, so tasks do not repeat them.>

- <constraint>

## Review focus

<The failure modes most likely to break this change, up to five, each with the
test that pins it.>

- <failure mode> — pinned by <test>.

## Approach

<A short paragraph: where the change goes and which existing code it reuses.
State the fact, then cite the evidence in parentheses, for example "The
existing lookup matches any option when given no name (research F2)".>

## Phase 1 — <name>

**Phase verify:** `<command>`

### Task 1 — <title>

- phase: 1
- parallel: no
- intent: <One to three sentences naming the behavior to build. No steps, no
  code, unless the exact code is the contract.>
- files: create `path/new.ts`; modify `path/existing.ts`
- interfaces: consumes `<signature or none>`; produces `<signature>`
- tests: <the cases that prove this task's own behavior, one per bullet>
  - <case>
- verify: `<command>`

<!-- Add another field, such as constraints or data, when the task needs it. -->

### Task 2 — <title>

- phase: 1
- parallel: after:[1]
- intent: …
- files: …
- interfaces: …
- tests:
  - …
- verify: `<command>`

## Acceptance checks

<What must be true when the whole change is done, each with the command that
proves it. Readable commands only, with no inline script and no hard-coded base
branch; a check that needs a script is a test.>

- <observable result>: `<command>`
