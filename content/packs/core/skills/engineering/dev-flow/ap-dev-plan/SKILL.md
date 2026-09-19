---
name: ap-dev-plan
description: Write or update a phased implementation plan with flat numbered tasks, one verify command per task and per phase, and acceptance commands, based on research evidence. Use when the user asks to write, draft, or revise an implementation plan or task breakdown for a development change, or when ap-dev-flow reaches its planning stage. Not for product requirements (ap-create-prd) or reviewing an existing plan (ap-review-plan).
---

# Write an implementation plan

Turn a goal and its research into a plan an implementer can execute one task
at a time. Describe what each task must achieve; the implementer writes the
code.

## Establish the target

Treat text supplied with the invocation as the goal, a run folder, research, or
constraints. When a dev-flow run folder is supplied or `ap-dev-flow` invokes
this stage, write `<run>/02-plan.md` from
[templates/02-plan.md](templates/02-plan.md), base it on `01-research.md`, and
set `status: planning` and `last_step` in `meta.yaml` and `STATUS.md`.
Otherwise use the template shape and write the plan where the user asks, or
return it in the conversation; do not create a run folder.

If no research exists, gather the minimum evidence needed first, or recommend
`ap-dev-research` for a non-trivial change.

## Plan shape

- **Purpose / done-when:** observable results a person or CI can check.
- **Open questions / risks:** carried from research with hypothesis and
  learn-via.
- **Assumptions:** each tied to a research finding or marked `UNVERIFIED`.
- **Out of scope** and a short **Architecture** section. Make no new technical
  claim without research evidence.
- **Phases**, each ending with a concrete **Phase verify** command.
- **Tasks** with flat ids across the whole plan: `### Task 1 — Title`,
  `### Task 2 — Title`, and so on; never `Task 2.3`. Each task lists:
  - `phase`: its phase number;
  - `parallel`: `yes`, `no`, or `after:[1, 2]`;
  - `intent`: what to achieve, not the code;
  - `files`: the files it will touch; and
  - `verify`: one concrete command that proves the task.
- **Progress** checklist, **Decision log**, and **Acceptance commands** for the
  finished change.

Task headings must stay parseable by `ap-dev-implement`: a Markdown heading
starting with `Task N` followed by a space, colon, `. `, or line end.

`parallel: yes` means the task's order is flexible. Implementation still runs
one writing implementer at a time.

## Size and order tasks

Keep each task reviewable on its own diff with its own verify command. Put
producers before consumers. Batch tiny same-shape edits into one task; split a
task that mixes unrelated concerns. Include tests, documentation, and cleanup
as tasks when the change needs them. Do not mandate a particular testing style.

## Finish

Keep frontmatter `status: draft` until a review marks it ready. Summarize the
phases, tasks, and remaining open questions. Under `ap-dev-flow`, the plan goes
to `ap-review-plan` next; on its own, suggest `ap-review-plan` before
implementing.
