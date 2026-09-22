# Agents Pack Core 0.32.0

## New: the dev-flow pipeline

- Add `ap-dev-flow`, an explicit-only orchestrator that takes a goal through
  research, planning, independent plan review, your approval, task-by-task
  implementation, integration code review, and acceptance verification in one
  isolated worktree.
- Every step is a separate skill that also works on its own: `ap-dev-research`,
  `ap-dev-plan`, `ap-review-plan`, `ap-dev-implement`, `ap-dev-review-code`, and
  `ap-dev-verify`. All are in the new **Dev flow** category and are part of the
  recommended selection. If a stage is not installed, `ap-dev-flow` names the
  missing component instead of running that step itself.
- Each run records its research, plan, reviews, implementation ledger, and
  verification in `<worktree-root>/.agents-pack/runs/<flow-id>/`. A nested
  `.gitignore` keeps these files out of Git. Removing the worktree removes its
  runs, so keep the worktree until the branch is merged.
- Add the optional `ap-clean-dev-runs` skill to list old run folders and remove
  the ones you confirm.
- `ap-start-dev-session` now looks for project context in `.agents-pack/`
  instead of the misspelled `.agentspack/`.

## `ap-dev-implement` replaces `ap-subagent-driven-development`

- `ap-dev-implement` keeps the subagent-driven workflow: a fresh implementer per
  task, local task commits, an independent read-only review of each task, and up
  to five reviewed repair rounds. It now also runs each task's verify command
  and each phase's verify command, and records its work in the run folder. The
  whole-branch review moved to `ap-dev-review-code`.
- `ap-subagent-driven-development` is retired. It remains installed for now as a
  short pointer to `ap-dev-implement` and will be removed in a later version.
- If you selected `ap-subagent-driven-development`, add the replacement:
  `agents-pack update --add ap-dev-implement`, or accept it when the update
  offers new components.
- **Update the Agents Pack CLI to 0.3.1 or later first.** When a later pack
  removes the retired skill, older CLIs refuse that update.

## `ap-review-plan` behavior changes

- A fresh subagent now performs every review round. The previous version
  reviewed the plan itself and also ran a parallel subagent review.
- Without subagent support, the review stops and says so. The previous version
  fell back to a second checklist pass.
- When the plan lives in a dev-flow run folder, each round is also saved as
  `03-plan-reviews/rNN.md`.
- Invoked on its own, it only critiques. It edits the plan only when you ask it
  to apply the changes, or when `ap-dev-flow` runs it.
