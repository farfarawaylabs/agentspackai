---
name: ap-review-plan
description: Review a development or implementation plan before work continues by dispatching a fresh, independent reviewer subagent for each round. Use when the user asks to review, critique, validate, challenge, sanity-check, or find missing steps in a plan, specification, migration sequence, architecture proposal, or task breakdown. Invoked on its own it is critique-only and does not edit the plan unless the user explicitly asks to apply the changes. Requires subagents.
---

# Review a Plan

Treat text supplied with the invocation as the plan, a plan path, a run folder,
or additional review criteria and constraints.

The review is always performed by a fresh subagent. The plan's author, and
this conversation if it wrote or edited the plan, never reviews it. A later
round never reuses an earlier reviewer.

## Establish the review target

Locate the complete plan. If it is not supplied directly, inspect the
referenced file, the run folder's `02-plan.md`, the current conversation plan,
or the clearly active repository plan. Do not guess between plausible plans.

Identify the requirements, repository instructions, product and technical
context, and code paths needed to judge the plan, so the reviewer can check it
against the system it will change.

## Choose the mode

- **Critique-only** (default when invoked on its own): produce the review; do
  not edit the plan file or begin implementation.
- **Apply**: used when `ap-dev-flow` runs this stage, or when the user
  explicitly asks to apply the review. The reviewer still never edits the plan.
  After the round, this controller applies the required changes checklist to
  the plan and records what changed.

## Require subagents

If the host cannot start an isolated subagent, or subagents are blocked or at
capacity, stop. Say that plan review requires an independent subagent and did
not run. Do not substitute a self-review or checklist pass. Inside a run
folder, set `status: stopped` and `stop_reason: no_subagents` in `meta.yaml`
and `STATUS.md`.

## Dispatch the reviewer

Start one fresh subagent per round, read-only when the provider supports that
restriction. Give it the complete plan, the user's review criteria, the
checklist below, the output format, and only the repository context needed to
verify the plan. Tell it not to implement or edit. Do not give it earlier
rounds' conclusions beyond the plan itself, and do not steer it toward a
suspected answer.

Ask it to check:

- requirement and acceptance-criteria coverage;
- grounding in current code, configuration, dependencies, and constraints;
- architecture, ownership boundaries, reuse, and unnecessary complexity;
- order, dependencies, prerequisites, rollout, and rollback;
- data migration, compatibility, concurrency, and partial-failure behavior;
- security, privacy, permissions, and trust boundaries;
- error handling, observability, and operational recovery;
- tests, fixtures, build checks, documentation, and cleanup;
- hidden assumptions, undefined decisions, scope creep, and premature detail;
- risks to existing behavior and user-owned changes; and
- at least one credible alternative for material design decisions.

Check readability, because a person approves the plan and each implementer
sees only its own task:

- the plan opens with a summary that someone who has not read the research
  can use to understand what will change, why, and which decisions they are
  approving;
- facts are written out in words, with research references only in
  parentheses, never a bare id carrying the meaning; and
- each task can be understood in under a minute and stands alone, restating
  any decision that constrains it.

For a dev-flow plan, also check that every task has a flat `### Task N — Title`
heading with `phase`, `parallel`, `intent`, `tests`, `files`, and one concrete
`verify` command, and that every phase ends with a **Phase verify** command.

Ask it to rethink its leading conclusion once before answering.

## Check and report

Verify the reviewer's load-bearing claims against the repository before
passing them on. Mark a claim you cannot confirm, and resolve disagreements
from evidence rather than by preference. Do not add findings of your own.

Return:

```text
## Verdict
Ready | Ready with changes | Not ready

## Blocking findings

## Important improvements

## Minor clarifications

## Subagent review
- Reviewer and round
- Claims confirmed against the repository
- Claims disputed or unverifiable, with the evidence

## Corrected plan
```

Omit empty severity sections. Every finding names the affected plan step,
explains the consequence, and proposes a concrete correction. Preserve sound
parts of the plan. Provide a corrected plan when the changes can be resolved
from available evidence; otherwise list the exact decisions or evidence
required.

## Record the round in a run folder

When the plan lives in a dev-flow run folder, also write
`<run>/03-plan-reviews/rNN.md` (`r01.md`, `r02.md`, …) from
[templates/plan-review.md](templates/plan-review.md). Its frontmatter records
`round`, `reviewer`, `blocking_count`, and `verdict`: `ready`,
`ready_with_changes`, or `not_ready`. While the round runs, set `status:
plan_review` in `meta.yaml` and `STATUS.md` and `status: in_review` in the
plan's frontmatter. Afterwards update `plan_round`, and set the plan's status to
`ready` or `ready_with_changes` for those verdicts, or back to `draft` for
`not_ready`. Only the approval gate in `ap-dev-flow` sets `approved`.

In apply mode, apply the required changes checklist to `02-plan.md`. Update
the plan's Summary and Decisions sections when a change affects them, but do
not record the review history in the plan; it stays in `03-plan-reviews/`. A
new round needs a new reviewer.
