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

## Write for two readers

The plan has two readers. A person decides whether to approve it from the top
sections. Each implementer receives only its own task section. Write the whole
plan in plain language, and state each fact once, where its reader will look.

- **Summary** (first): what the change does and why, in two or three
  sentences, for someone who has not read the research. Then what changes,
  the number of tasks and phases, the decisions the reader is approving with
  a one-line reason each, what is not included, and risks or open questions
  with the assumption taken. A reader should be able to approve or push back
  from this section alone.
- **Done when:** observable results a person or CI can check.
- **Approach:** a short paragraph on where the change goes and what existing
  code it reuses. Make no technical claim without research evidence.
- **Phases**, each ending with a concrete **Phase verify** command.
- **Tasks**, with flat ids across the whole plan: `### Task 1 — Title`,
  `### Task 2 — Title`, and so on; never `Task 2.3`. Each task lists:
  - `phase`: its phase number;
  - `parallel`: `yes`, `no`, or `after:[1, 2]`;
  - `intent`: two or three sentences describing the behavior to build, not
    the code;
  - `tests`: the cases that prove it, one per bullet;
  - `files`: the files it will touch; and
  - `verify`: one concrete command that proves the task.
- **Decisions:** the current decisions, each with a one-line reason.
- **Acceptance checks:** a short name and one command each for the finished
  change. Put a check that needs more than a simple command into a test.

Rules that keep it readable:

- **Tasks stand alone.** The implementer never sees the summary, so restate
  any decision that constrains a task in one plain sentence inside it. Never
  write "see Q1" instead.
- **Facts first, references second.** Write the fact in words and cite the
  research in parentheses: "The existing lookup matches any option when given
  no name (research F2)." Never leave a bare id such as "(A2)" to carry the
  meaning.
- **Code only when the code is the decision.** Otherwise describe behavior and
  let the implementer write it. Exact names, paths, and commands stay exact.
- **No history.** The plan states the current plan. Review rounds live in
  `03-plan-reviews/`; do not record "round 1 changed X" here.

Task headings must stay parseable by `ap-dev-implement`: a Markdown heading
starting with `Task N` followed by a space, colon, `. `, or line end.

`parallel: yes` means the task's order is flexible. Implementation still runs
one writing implementer at a time.

The frontmatter `status` moves through `draft`, `in_review`,
`ready_with_changes` or `ready`, `approved`, `executing`, and `done`. Only the
approval gate sets `approved`.

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
