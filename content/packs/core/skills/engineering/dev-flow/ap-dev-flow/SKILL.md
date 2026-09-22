---
name: ap-dev-flow
description: Run the full plan-first development pipeline for a goal (research, plan, independent plan review, human approval, task-by-task implementation with reviews, integration code review, and acceptance verification) by sequencing the ap-dev-* stage skills and ap-review-plan in one isolated worktree with an on-disk run folder. Use only when the user explicitly invokes ap-dev-flow; do not select it automatically, and use the individual stage skills for a single step.
---

# Dev flow

Take a goal to a reviewed, verified branch. This skill owns sequencing, the
worktree, the run folder, the approval gate, caps, and the final report. The
stage skills do the work, and each remains usable on its own. Never perform a
stage's work from memory in this skill.

## Read the request

Treat text supplied with the invocation as the goal, constraints, a base ref,
checkpoints, or an existing run to resume. If the ask is too fuzzy to research,
suggest `ap-create-prd` first. If a run folder or flow id is supplied, resume
it: read `meta.yaml` and `STATUS.md`, then continue from `last_step` without
redoing completed stages or resetting round counters.

## Check the stages

Before creating anything, confirm these skills are installed:

`ap-dev-research`, `ap-dev-plan`, `ap-review-plan`, `ap-dev-implement`,
`ap-dev-review-code`, and `ap-dev-verify`.

Locate each one now and read its instructions when you reach its stage. If one
is missing, report the exact component id, offer the normal Agents Pack install
workflow (`ap-manage-agents-pack` or `agents-pack install <id>`), and do not
start. If a stage goes missing mid-run, set `status: stopped` with
`stop_reason: missing_component <id>` and stop. Never substitute your own
version of a missing stage.

Check whether the host can start isolated subagents. Plan review and
implementation require them. Without them, say at the start that the run will
stop before plan review, then research and plan only.

## Own one worktree and one run

Establish the isolated worktree once with `ap-start-dev-session`, or reuse the
current directory when it is already a dedicated worktree for this goal. Never
create a second worktree later; every stage runs in this one.

From the worktree root, create the run with the installed `ap-dev-implement`
script:

```sh
bash <ap-dev-implement-directory>/scripts/dev-run-workspace new <short-goal-slug>
```

It creates `<worktree-root>/.agents-pack/runs/<flow-id>/` with `meta.yaml`,
`STATUS.md`, and a nested `.agents-pack/runs/.gitignore` so run files stay out
of Git. Do not ask the user to edit the root `.gitignore`. Fill `goal`,
`base_ref`, and `merge_base` in `meta.yaml`.

Tell the user the absolute worktree and run paths, and that:

- resuming later means starting a session in that worktree or passing the run
  path;
- removing the worktree deletes the run folder, so keep the worktree until the
  branch is merged.

Keep `STATUS.md` a short mirror of `meta.yaml`, and update both at every stage
change: `status`, `last_step`, `plan_round`, `code_review_round`,
`current_task`, `stop_reason`, and `updated_at`.

## Run the stages

Pass the run path to every stage.

1. **Research.** Run `ap-dev-research` to write `01-research.md`. Ask the user
   about `blocking` open questions whose answers would change the plan.
2. **Plan.** Run `ap-dev-plan` to write `02-plan.md`.
3. **Plan review.** Run `ap-review-plan` in apply mode. Each round uses a fresh
   reviewer subagent and writes `03-plan-reviews/rNN.md`. Stop after a `ready`
   verdict or two rounds (`plan_review_max`). After `ready_with_changes` or
   `not_ready`, apply the required changes to `02-plan.md` and start the next
   round with a new reviewer.
4. **Approval gate.** Set `status: awaiting_approval`. Present the plan's
   **Summary**, **Decisions**, and **Scope** sections as written in
   `02-plan.md`, so what the user approves matches the file, followed by the
   task titles, the latest review verdict with any unresolved findings, and
   the plan path. Wait for the user's explicit
   approval; incorporate requested changes (another review round if they are
   material). Nothing is implemented before approval. On approval, set the
   plan's frontmatter `status: approved`.
5. **Implement.** Run `ap-dev-implement` with this run and worktree. It
   executes tasks in order, reviews each one, runs each phase's verify command
   before the next phase, and records everything in
   `04-implementation-ledger.md`.
6. **Integration review.** Run `ap-dev-review-code` on `merge_base..HEAD`, with
   at most two rounds (`integration_review_max`). Findings mapped to `revise`
   or `block` get a repair wave and a new reviewer.
7. **Verify.** Run `ap-dev-verify` for the plan's acceptance commands, with at
   most two repair waves (`verify_repair_max`).
8. **Ship.** Set `status: done`. The branch is ready. Offer to open a pull
   request, and open one only if the user agrees. Its body includes the plan
   (`02-plan.md`, collapsed) and the `06-verify.md` table, because the run
   folder is not committed.
9. **Remember.** Use `ap-save-memory` for durable, verified project knowledge
   learned during the run.

## Stop conditions

Set `status: stopped`, record `stop_reason`, keep every artifact, and report
what remains when:

- subagents are unavailable before plan review or implementation
  (`no_subagents`);
- a stage component is missing (`missing_component <id>`);
- a task's repair ladder ends in a load-bearing defect with no credible
  correction (`task_repair_cap`), or a phase verify still fails after its
  repair waves (`phase_verify_cap`);
- integration review or verification exhausts its cap
  (`integration_review_cap`, `verify_repair_cap`); or
- the user stops the run.

If plan review reaches its cap without `ready`, do not stop: take the plan to
the approval gate with its unresolved findings and let the user decide.

## Final report

Report the outcome, the branch, the absolute worktree and run paths, each
stage's result, the tasks and commits, review verdicts and reviewers used,
verification results, every `Ruling:` from the ledger with its cost if wrong,
parked or deferred findings, and open questions. Recommend keeping the
worktree until the branch is merged and `ap-clean-dev-runs` for removing old
runs later. Do not push, merge, publish, or deploy without separate
authorization.
