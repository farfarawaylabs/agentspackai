---
name: ap-dev-flow-auto
description: Run the full plan-first development pipeline unattended, from research through a machine-approved plan, reviewed task-by-task implementation, integration code review, and acceptance verification, ending with a pushed branch and an open draft pull request. Use only when the user explicitly invokes ap-dev-flow-auto and wants no mid-run questions; use ap-dev-flow when a human should approve the plan, and the individual stage skills for a single step.
---

# Dev flow (unattended)

Take a goal to an open draft pull request without stopping to ask questions.
This skill owns sequencing, the worktree, the run folder, the machine plan
gate, caps, the pull request, and the final report. The stage skills do the
work, and each remains usable on its own. Never perform a stage's work from
memory in this skill.

This is `ap-dev-flow` with the human removed from the loop. The review bar is
identical: every task still gets an independent review, and the whole change
still gets an integration review and acceptance verification. What changes is
who approves the plan and what happens to a question nobody is there to answer.

## Read the request

Treat text supplied with the invocation as the goal, constraints, a base ref,
or an existing run to resume. If a run folder or flow id is supplied, resume
it: read `meta.yaml` and `STATUS.md`, then continue from `last_step` without
redoing completed stages or resetting round counters.

If the ask is too fuzzy to research, stop before creating anything and say so.
Guessing at a vague goal for an entire unattended run wastes more than it
saves. Recommend `ap-create-prd` or `ap-dev-flow`.

Honor an instruction not to open a pull request. The run then ends at a ready
branch with the pull request body written to `<run>/07-pr-body.md`.

## Authority

The user's explicit invocation of this skill authorizes you to push the branch
this run creates to the repository's default remote and to open one **draft**
pull request from it. State both before starting: the remote, the branch name,
and that the run ends with a draft pull request.

It does not authorize anything else. Do not merge, publish, deploy, or release.
Do not force-push, rewrite remote history, or delete remote branches. Do not
push to the primary or any protected branch, or to any branch this run did not
create. Do not touch a remote other than the default one. Everything
`ap-dev-implement` forbids its implementers still applies to them.

Open the pull request as a draft. It is machine-produced work that a human has
not yet approved, and the draft state says so.

## Check before starting

Doing an entire unattended run and only then discovering it cannot finish is
the one failure worth preventing up front. Before creating anything, confirm:

1. **The stages are installed:** `ap-dev-research`, `ap-dev-plan`,
   `ap-review-plan`, `ap-dev-implement`, `ap-dev-review-code`, and
   `ap-dev-verify`. If one is missing, report its exact component id, offer the
   normal Agents Pack install workflow (`ap-manage-agents-pack` or
   `agents-pack install <id>`), and do not start. Never substitute your own
   version of a missing stage.
2. **The host can start isolated subagents.** Plan review and implementation
   require them. Without them, stop now rather than researching and planning
   into a dead end: `status: stopped`, `stop_reason: no_subagents`. Never
   degrade to reviewing your own work.
3. **Pull requests can be opened** — `gh auth status` succeeds, or the host has
   an equivalent authenticated mechanism. If not, stop with `status: stopped`
   and `stop_reason: no_pr_tooling`, and say what would fix it (`gh auth
   login`, or re-invoke asking for no pull request). Skip this check when the
   user asked for no pull request.

If a stage goes missing mid-run, set `status: stopped` with
`stop_reason: missing_component <id>` and stop.

## Own one worktree and one run

Establish the isolated worktree once with `ap-start-dev-session`, or reuse the
current directory when it is already a dedicated worktree for this goal. Never
create a second worktree later; every stage runs in this one.

From the worktree root, create the run in auto mode with the installed
`ap-dev-implement` script:

```sh
bash <ap-dev-implement-directory>/scripts/dev-run-workspace new <short-goal-slug> auto
```

The third argument records `mode: auto` and the raised caps in `meta.yaml`. The
stages read both from that file, so never hand-edit them. It also creates
`<worktree-root>/.agents-pack/runs/<flow-id>/` with `STATUS.md` and a nested
`.agents-pack/runs/.gitignore` so run files stay out of Git. Do not ask the
user to edit the root `.gitignore`. Fill `goal`, `base_ref`, and `merge_base`
in `meta.yaml`.

Tell the user the absolute worktree and run paths, and that:

- resuming later means starting a session in that worktree or passing the run
  path;
- removing the worktree deletes the run folder, so keep the worktree until the
  branch is merged. The pull request body carries the plan and the verification
  table for exactly this reason.

Keep `STATUS.md` a short mirror of `meta.yaml`, and update both at every stage
change: `status`, `last_step`, `plan_round`, `code_review_round`,
`current_task`, `stop_reason`, `pr_url`, and `updated_at`.

## Run the stages

Pass the run path to every stage. Ask the user nothing from here until the
final report.

1. **Research.** Run `ap-dev-research` to write `01-research.md`. It will not
   ask about `blocking` questions in auto mode. Confirm each open question
   carries a hypothesis and a `learn_via`, and that
   `open_questions_carried: true` is set when any remain.
2. **Plan.** Run `ap-dev-plan` to write `02-plan.md`.
3. **Plan review and the machine gate.** Run `ap-review-plan` in apply mode.
   Each round uses a fresh reviewer subagent and writes
   `03-plan-reviews/rNN.md`.

   The gate passes only on verdict `ready` with `blocking_count: 0`. Anything
   else — `ready_with_changes`, `not_ready`, or `ready` with blocking findings
   — means you apply the round's required changes to `02-plan.md` and run
   another round with a new reviewer. `ready_with_changes` is not a pass: the
   changes are the point of the verdict.

   `plan_review_max` is 4 in auto. If the cap is reached without a passing
   verdict, stop: `status: stopped`, `stop_reason: plan_review_cap`. Do not
   implement an unapproved plan. This differs from `ap-dev-flow`, which can
   hand an unresolved plan to a human instead.

   On a pass, set the plan's frontmatter `status: approved` and record in
   `STATUS.md` that the machine gate approved it and at which round.
4. **Implement.** Run `ap-dev-implement` with this run and worktree. It
   executes tasks in order, reviews each one, runs each phase's verify command
   before the next phase, and records everything in
   `04-implementation-ledger.md`.
5. **Integration review.** Run `ap-dev-review-code` on `merge_base..HEAD`, with
   at most four rounds (`integration_review_max`). Findings mapped to `revise`
   or `block` get a repair wave and a new reviewer.
6. **Verify.** Run `ap-dev-verify` for the plan's acceptance commands, with at
   most four repair waves (`verify_repair_max`).
7. **Ship.** See below.
8. **Remember.** Use `ap-save-memory` for durable, verified project knowledge
   learned during the run.

## Ship

Only reach this step with implementation complete, the integration review at
`approve`, and verification passing.

Write the pull request body to `<run>/07-pr-body.md` from
[templates/pr-body.md](templates/pr-body.md). Fill every section from the run
folder, not from memory:

- **Summary** — the goal and what the branch actually changes.
- **Plan** — the contents of `02-plan.md`, collapsed.
- **Verification** — the table from `06-verify.md`.
- **Unresolved questions** — every open question still carried, with its kind,
  the assumption taken, and how it can be learned.
- **Unresolved findings** — every parked or adjudicated finding from
  `04-implementation-ledger.md` and the review rounds, with its ruling and the
  cost if wrong. Include any ruling recorded for a plan that changed after
  tasks were already complete.

Say plainly when a section is empty; do not delete the heading.

Then push the branch to the default remote and open the draft pull request with
that body. Record `pr_url` in `meta.yaml` and `STATUS.md` and set
`status: done`.

If the user asked for no pull request, stop after writing the body, leave the
branch unpushed, and set `status: done` with the body's path in the report.

## Stop conditions

Set `status: stopped`, record `stop_reason`, keep every artifact, and report
what remains when:

- the checks before starting fail (`no_subagents`, `no_pr_tooling`);
- a stage component is missing (`missing_component <id>`);
- plan review reaches its cap without a passing verdict (`plan_review_cap`);
- a task's repair ladder ends in a load-bearing defect with no credible
  correction (`task_repair_cap`), or a phase verify still fails after its
  repair waves (`phase_verify_cap`);
- integration review or verification exhausts its cap
  (`integration_review_cap`, `verify_repair_cap`); or
- the user stops the run.

**A stopped run opens no pull request.** The branch and the run folder stay
exactly as they are, so a human can pick the work up. Report the stop reason,
what was completed, and what the next action would be.

Open questions are never a stop condition. Carry them to the pull request.

## Final report

Report the outcome, the pull request URL, the branch, the absolute worktree and
run paths, each stage's result, the plan-review round that passed the gate, the
tasks and commits, review verdicts and reviewers used, verification results,
every `Ruling:` from the ledger with its cost if wrong, parked or deferred
findings, and carried open questions. Recommend keeping the worktree until the
branch is merged and `ap-clean-dev-runs` for removing old runs later.

The pull request is a draft and nothing has been merged. Say so, and say that
merging, publishing, and deploying still need a person.
