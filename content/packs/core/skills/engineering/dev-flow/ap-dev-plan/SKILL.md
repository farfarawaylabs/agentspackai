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

A person decides whether to approve the plan from its top sections. Each
implementer receives only its own task, plus the **Global constraints**, the
interfaces of finished tasks, and any rulings, which the controller passes at
dispatch. Say each thing once, where its reader will look. Do not repeat a
decision inside a task.

Sections, in order:

- **Summary:** what the change does and why, in two or three sentences with a
  concrete example, for someone who has not read the research. Then the files
  or areas that change and the number of tasks and phases.
- **Decisions:** the choices being approved, one or two lines each with the
  reason. Consequences and edge cases belong to the task that implements them,
  not here.
- **Scope:** what is not included, plus risks and open questions with the
  assumption taken and how it will be learned.
- **Global constraints:** rules that bind every task, copied verbatim from the
  specification, repository instructions, or the decisions above.
- **Review focus:** up to five failure modes most likely to break this change,
  each naming the test that pins it.
- **Approach:** a short paragraph on where the change goes and what existing
  code it reuses. Make no technical claim without research evidence.
- **Phases**, each ending with a concrete **Phase verify** command.
- **Tasks** (below).
- **Acceptance checks:** what must be true when the change is done, each with
  one readable command. A check that needs a script belongs in a test.

Each task carries:

- `phase`, and `parallel` as `yes`, `no`, or `after:[1, 2]`;
- `intent`: one to three sentences naming the behavior to build;
- `files`: what it creates and modifies;
- `interfaces`: what it consumes from earlier tasks and produces for later
  ones, or `none`;
- `tests`: the cases that prove it, one per bullet; and
- `verify`: one concrete command.

Rules that keep tasks readable and useful:

- **Describe behavior, not steps.** No nested step lists inside a task, and no
  code unless the exact code is the contract. Name the required property
  instead of the algorithm.
- **Do not dictate internal structure** such as which helper to extract, unless
  a contract in `interfaces` requires it. Say what must not break, for example
  "the counter must not re-run transliteration".
- **Facts first, references second.** Write the fact in words and cite the
  research in parentheses. Never leave a bare id such as "(A2)" to carry the
  meaning.
- **No history.** The plan states the current plan; review rounds live in
  `03-plan-reviews/`.

Keep the whole plan short enough to read in one sitting; for a small feature
that is roughly 150 lines. If it grows past that, the tasks are over-specified
or the scope is too large.

Task headings must stay parseable by `ap-dev-implement`: a Markdown heading
starting with `Task N` followed by a space, colon, `. `, or line end. Ids are
flat across the whole plan (`Task 1`, `Task 2`), never `Task 2.3`.

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
