---
name: ap-dev-research
description: Research a development goal before planning by gathering evidence from the repository and current documentation, and record findings that each cite a file path or source URL. Use when the user asks to research, investigate, or gather context for a feature or change before writing an implementation plan, or when ap-dev-flow or ap-dev-flow-auto reaches its research stage. Rejects findings without evidence. Not for debugging a failure or for market research.
---

# Research a development goal

Produce the evidence a plan will rely on. Findings are claims backed by
evidence; assumptions are labeled separately. Do not propose the plan here.

## Establish the target

Treat text supplied with the invocation as the goal, a run folder, or
constraints. When a dev-flow run folder is supplied or an orchestrator invokes
this stage, write `<run>/01-research.md` from
[templates/01-research.md](templates/01-research.md) and set `status:
researching` and `last_step` in `meta.yaml` and `STATUS.md`. Otherwise return
the research in the conversation or write it to the path the user names; do
not create a run folder.

Restate the goal in one to three sentences. Read the repository instructions
and the product, technical, and progress documents that apply.

## Gather evidence

Read the code paths, configuration, dependencies, tests, and documentation the
goal touches. For version-sensitive behavior (APIs, SDKs, CLI flags,
frameworks), check current primary documentation and the versions the
repository actually uses. Run read-only commands when they settle a question.
Do not modify files other than the research output.

## Write findings

Each finding is one claim with:

- **Evidence:** a repository path with line range, or a current documentation
  URL;
- **What I read / ran:** the files, commands, or pages behind it; and
- **Implication for the plan.**

Reject any finding that has no evidence line; do not write it. Move it to
**Assumptions** labeled `UNVERIFIED`, or to **Unknowns / evidence gaps**.

Record open questions with a kind:

- `blocking`: the plan ideally needs an answer to be correct;
- `defer_until_implement`: only knowable after building or measuring; or
- `out_of_scope`: not part of this work.

For each question you continue past, record a hypothesis and how it will be
learned (a task or phase verify, a measurement, or the user).

List non-goals so the plan does not absorb adjacent work.

## Finish

Set the frontmatter `status`: `complete`, `complete_with_open_questions`, or
`insufficient` when the evidence cannot support a plan. Summarize the key
findings, open questions, and evidence gaps for the user.

When a run folder is present, `mode` in `meta.yaml` decides what happens to
`blocking` questions. Under `interactive`, ask about them before planning when
the answer would change the plan materially. Under `auto`, ask nothing: keep
the recorded hypothesis and `learn_via` for each one, set
`open_questions_carried: true` in `meta.yaml`, and continue. The orchestrator
carries them to the pull request.
