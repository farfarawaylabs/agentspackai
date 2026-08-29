---
name: ap-subagent-driven-development
description: Execute an existing implementation plan through a fresh implementer subagent per task, task-scoped review and repair loops, and a final whole-branch review. Use only when the user explicitly invokes ap-subagent-driven-development; do not select it automatically for ordinary implementation requests.
license: MIT
metadata:
  author: obra
  version: "6.3.0-agents-pack.1"
  source: "https://github.com/obra/superpowers"
  upstream_commit: "b36e0829c6d0140e93cfef2ca599b1b07d4a7797"
---

# Subagent-driven development

Execute a prepared implementation plan through isolated subagent contexts:

1. a fresh writable implementer for each task;
2. an independent, read-only task review covering spec compliance and quality;
3. reviewed repair rounds when required; and
4. a broad, read-only whole-branch review after all tasks.

The controller coordinates only. It owns the plan, task boundaries, ledger,
dispatches, review packages, rulings, and final report. It does not implement
or repair code itself.

## Invocation and authority

Run this workflow only when the user explicitly invokes this skill by name.
Do not infer it from a generic request to implement or execute a plan.

Explicit invocation authorizes implementer subagents to create local commits
for their assigned tasks inside the dedicated feature worktree. It does not
authorize:

- committing unrelated or pre-existing changes;
- working directly on the repository's primary or protected branch;
- pushing, merging, publishing, deploying, or opening a pull request; or
- destructive, irreversible, security-sensitive, or external side effects
  beyond cleanup of this workflow's exact generated run workspace.

Those actions still require the authority normally applicable to them. After
the readiness gate passes, do not ask for confirmation between ordinary plan
tasks. Stop only for one of these conditions:

1. an irreversible or destructive operation beyond the validated scratch
   cleanup defined by this skill;
2. a security-sensitive action;
3. a side effect outside the worktree that normally requires confirmation,
   such as push, merge, publish, deployment, or production mutation; or
4. a plan so broken or ambiguous that every viable path is a guess.

For lesser ambiguity, make a reversible ruling, record it in the ledger as
`Ruling: <decision> -- <reason> -- <cost if wrong>`, and continue. The
specification is authoritative; the plan is its implementation argument.

## Readiness gate

Before dispatching an implementer, verify all of the following:

- a concrete implementation plan exists and has numbered `Task N` headings;
- its tasks are mostly independent or can safely run sequentially;
- the current provider exposes subagents with isolated contexts;
- the repository is a Git repository with an existing commit;
- execution will occur in a dedicated feature branch and linked worktree, not
  the primary branch or the user's ordinary checkout;
- that execution worktree is clean before Task 1; and
- Git can create local commits without changing repository or global identity.

### Isolate the execution worktree

Inspect `git worktree list --porcelain`, the current branch, and `git status`
before choosing the execution directory.

1. If the current directory is already a clean, dedicated linked worktree on
   the feature branch for this plan, reuse it.
2. Otherwise use the base ref named by the user or plan; when neither names
   one, use the repository's primary branch rather than an unrelated feature
   branch. Choose a unique descriptive feature branch and an adjacent worktree
   path outside the existing checkout, following repository conventions. A
   typical command is
   `git worktree add -b <feature-branch> <worktree-path> <base-ref>`. If the
   intended feature branch already exists and is not checked out elsewhere, use
   `git worktree add <worktree-path> <feature-branch>` instead.
3. Resolve the new worktree with `pwd -P`. Use that physical path as the
   controller's working directory and pass it explicitly as the working
   directory for every implementer, reviewer, script, and Git command in this
   run.
4. Verify the selected execution worktree is clean and not on the repository's
   primary branch before recording the original base and dispatching Task 1.

Uncommitted changes in the user's original checkout may coexist with a clean
linked execution worktree and do not block this workflow. Never stash, reset,
clean, copy, commit, or absorb those changes to manufacture a baseline. If the
selected execution worktree itself is dirty, reuse it only after the user
chooses how those changes should be handled; otherwise create a different clean
worktree.

## Persist the run

Conversation context can be compacted or lost. Keep durable, gitignored run
state under `.agents-pack/runs/subagent-development/` in the active worktree.

Invoke bundled scripts through Bash because pack installation does not preserve
executable mode:

```sh
bash <skill-directory>/scripts/sdd-workspace PLAN_FILE
bash <skill-directory>/scripts/task-brief PLAN_FILE TASK_NUMBER
bash <skill-directory>/scripts/review-package PLAN_FILE BASE HEAD
```

`sdd-workspace` derives the workspace from the normalized plan path and plan
content, so same-named plans in different directories cannot collide and a
materially changed plan starts a distinct run. It prints an absolute path.

Use `<workspace>/progress.md` as the ledger. Its first line must be:

```text
# SDD ledger -- plan: <absolute plan path>
```

If the identity matches, trust completed task lines and recorded commits over
conversation memory. Resume at the first incomplete task or the next recorded
repair round. Never redispatch a task marked complete. Leave workspaces for
other plan identities untouched.

The ledger must contain:

- the original merge base and starting head;
- the preflight task/interface table;
- every ruling and its downside if wrong;
- each task's base, head, implementer identity, review result, and repair round;
- deferred minor and parked findings; and
- each task completion line.

The Git history is the durable implementation record. The ledger is the
controller's recovery and decision record.

## Preflight the complete plan once

Read the plan once. Read any specification it names. Create one controller todo
per task, then write a preflight table to the ledger:

- one row per task checking that its files, implementation, tests, and
  verification agree with one another; and
- one row for every task pair that shares a file or interface, naming what the
  earlier task produces and what the later task consumes.

Rule on contradictions before Task 1. Batch several tiny, independent,
same-shape edits into one dispatch when they require no separate judgment,
tests, or review surface. Otherwise keep one dispatch per planned task.

Treat the plan as immutable for the duration of the run. Record corrections,
decisions, and completion in the ledger instead of editing the plan file. A
changed plan intentionally resolves to a new run identity and must be
re-preflighted rather than silently continuing against stale briefs.

## Choose subagents portably

Use the provider's native subagent mechanism. Give implementers write access to
the dedicated worktree. Give reviewers read-only access whenever the provider
supports that restriction.

Choose capability by role without storing provider-specific model names:

- fast or economical capability for mechanical one- or two-file tasks with a
  complete specification;
- standard capability for multi-file integration and debugging;
- highest available reasoning capability for architecture, subtle risk, and
  the final whole-branch review; and
- at least one capability tier above the stuck implementer for repair rounds
  four and five.

Specify the chosen model or capability when the provider supports explicit
selection. Otherwise use the closest native role or reasoning controls. Do not
invent a model identifier.

Never run multiple writable implementers concurrently in the same worktree.
Read-only exploration may run concurrently when it cannot mutate shared state,
but it is not part of the required task loop.

### Wait without thrashing

After dispatching a subagent, use the provider's blocking wait or join
mechanism with a practical bounded interval. Do not rapidly poll child status
or narrate every unchanged wait. If a wait times out while useful work is still
running, wait again and report only meaningful progress, a blocker, or a state
change. Reconcile the status of every dispatched child before starting the next
writable implementer and before declaring the run complete.

## Task loop

### 1. Prepare the task

Record `BASE=$(git rev-parse HEAD)` before dispatch. Generate the task brief:

```sh
bash <skill-directory>/scripts/task-brief PLAN_FILE N
```

The script prints the brief path. Use a sibling `task-N-report.md` path for the
implementer's durable report. Never make the implementer read the whole plan.

Dispatch a fresh implementer using
[implementer-prompt.md](implementer-prompt.md). Provide only:

- one sentence explaining where this task fits;
- the task brief path as the single source of exact requirements;
- relevant interfaces or decisions from completed tasks;
- rulings that bind this task; and
- the report path and short return contract.

Record the implementer's identity so repair rounds one through three can resume
the same subagent. The implementer must implement, test, self-review, commit
only its task, and write the full report before returning.

### 2. Handle the implementer status

The implementer returns one status:

- `DONE`: proceed to review.
- `DONE_WITH_CONCERNS`: read the concerns; resolve correctness or scope doubts
  before review, and ledger non-blocking observations.
- `NEEDS_CONTEXT`: provide the missing context and resume the implementer.
- `BLOCKED`: change something material before retrying--add context, use a more
  capable agent, split the task, or record a plan correction.

Never force an unchanged retry after a blocker. Confirm `HEAD` advanced and the
worktree is clean before creating the review package. If the implementer did
not commit, resume it to complete the required handoff.

### 3. Review the task

Generate the task's immutable review package from the recorded base, never
from an assumed `HEAD~1`:

```sh
bash <skill-directory>/scripts/review-package PLAN_FILE BASE HEAD
```

Dispatch a fresh read-only reviewer using
[task-reviewer-prompt.md](task-reviewer-prompt.md). Give it:

- the task brief path;
- the implementer report path;
- the review package path and exact base/head SHAs; and
- verbatim global constraints from the specification or plan that bind this
  task.

The reviewer must return both a spec-compliance verdict and a task-quality
verdict. Implementer self-review never replaces this independent review. Do
not tell the reviewer to suppress a suspected false positive; let it report
the finding and adjudicate through the workflow.

Resolve every `Cannot verify from diff` item before completing the task. If it
is a real gap, place it in the repair loop.

### 4. Repair and re-review

Enter the repair loop for failed spec compliance, any Critical or Important
finding, or a confirmed verification gap. Minor findings do not enter the
loop; record them as deferred for the final review.

A repair round is exactly one implementer repair plus one scoped re-review.
Use at most five rounds per task, preserving the upstream circuit breaker:

- rounds 1-3 resume the original implementer with every open finding copied
  verbatim;
- rounds 4-5 use a fresh, more capable implementer with the brief, report,
  findings, and prior-attempt count; and
- every implementer commits the repair, appends its tests and results to the
  report, and returns the short status contract.

Before each re-review, record `FIX_BASE` as the head seen by the prior review,
then generate a package for `FIX_BASE..HEAD`. Dispatch a fresh reviewer using
[re-review-prompt.md](re-review-prompt.md). It verdicts each prior finding and
checks only the repair diff for new breakage.

After every round append:

```text
Task <N>: fix round <R>/5 (<X> addressed, <Y> open; commits <base7>..<head7>)
```

Do not repair code in the controller context. Do not skip the scoped re-review.

At round five, stop dispatching and adjudicate each residual finding:

- park a false, contestable, or non-load-bearing finding with a ruling;
- for a real load-bearing defect, rule on the smallest correction that keeps
  downstream tasks valid and carry it into the next task; or
- stop and ask the user only if every correction path is a guess.

Adjudication is allowed only after the fifth re-review. Never silently discard
a finding.

### 5. Complete the task

When the review is clean, or every residual finding is parked with a ruling at
the breaker, append one line:

```text
Task <N>: complete (commits <base7>..<head7>, review clean)
Task <N>: complete (commits <base7>..<head7>, <K> parked)
```

Mark the controller todo complete and continue immediately to the next task.

## Final whole-branch review

After every task is complete, generate one review package from the original
merge base to `HEAD`. Dispatch a fresh read-only reviewer at the highest
available reasoning capability using
[final-reviewer-prompt.md](final-reviewer-prompt.md). Give it the plan,
specification when present, ledger, and review package.

If the final review finds blocking issues:

1. dispatch one implementer with the complete finding set;
2. require one repair commit and covering verification;
3. generate one package for that repair range; and
4. run exactly one scoped re-review.

Adjudicate residuals in the ledger. Do not start a second final fix wave.
Surface unresolved load-bearing findings to the user.

## Finish transparently

Before removing scratch state, collect every ledger line containing `Ruling:`
and every parked or unresolved finding. Report them to the user in order with
the cost if each ruling was wrong.

Delete only this plan's exact generated workspace after the final review is
clean and the ledger information has been surfaced. Validate that the resolved
target is the workspace printed for this plan under
`.agents-pack/runs/subagent-development/` before removing it recursively. Never
derive the deletion target from an unresolved variable, delete the shared run
root, or delete a sibling run directory. If the target cannot be validated,
leave it in place and report it instead.

Finish by reporting:

- tasks and commits created;
- verification performed and any gaps;
- task and final-review outcomes;
- deferred, parked, or unresolved findings;
- every ruling made; and
- the feature branch and worktree location.

Do not push, merge, publish, deploy, or open a pull request unless the user has
separately authorized that next step.

## Attribution

Adapted from Jesse Vincent's
[Superpowers subagent-driven-development skill](https://github.com/obra/superpowers/tree/b36e0829c6d0140e93cfef2ca599b1b07d4a7797/skills/subagent-driven-development)
at commit `b36e0829c6d0140e93cfef2ca599b1b07d4a7797` (`v6.3.0`). The original is
MIT licensed; see [LICENSE.md](LICENSE.md).
