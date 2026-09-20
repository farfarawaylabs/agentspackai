---
name: ap-dev-implement
description: Execute an approved dev-flow plan task by task with a fresh implementer subagent per task, an independent read-only task review, and a reviewed repair ladder, recording everything in the run folder. Supersedes ap-subagent-driven-development. Use only when the user explicitly invokes ap-dev-implement or ap-subagent-driven-development, or when ap-dev-flow reaches its implement stage; do not select it automatically for ordinary implementation requests.
license: MIT
metadata:
  author: obra
  version: "6.3.0-agents-pack.2"
  source: "https://github.com/obra/superpowers"
  upstream_commit: "b36e0829c6d0140e93cfef2ca599b1b07d4a7797"
---

# Implement a plan

Execute an approved plan through isolated subagent contexts:

1. a fresh writable implementer for each task;
2. the task's verify command, which must pass;
3. an independent, read-only task review of that task's diff; and
4. reviewed repair rounds when required.

The controller coordinates only. It owns task boundaries, the ledger,
dispatches, review packages, rulings, and the report. It never edits code.
Implementer self-review never replaces the independent task review.

This stage is part of the `ap-dev-flow` pipeline and replaces
`ap-subagent-driven-development`. Integration review of the whole change and
acceptance verification belong to `ap-dev-review-code` and `ap-dev-verify`.

## Invocation and authority

Run only when the user explicitly invokes this skill (or its predecessor
`ap-subagent-driven-development`), or when `ap-dev-flow` reaches implement
after the user approved the plan.

Explicit invocation authorizes implementer subagents to create local commits
for their assigned tasks inside the dedicated worktree. It does not authorize:

- committing unrelated or pre-existing changes;
- working on the repository's primary or protected branch;
- pushing, merging, publishing, deploying, or opening a pull request; or
- destructive, irreversible, security-sensitive, or external side effects.

After the readiness gate passes, do not ask for confirmation between ordinary
tasks. Stop only for an irreversible or destructive operation, a
security-sensitive action, a side effect outside the worktree that normally
requires confirmation, or a plan so broken that every viable path is a guess.

For lesser ambiguity, make a reversible ruling, record it in the ledger as
`Ruling: <decision> -- <reason> -- <cost if wrong>`, and continue.

## Locate the run

Scripts live in this skill's `scripts/` folder. Invoke them through `bash`,
because pack installation does not preserve executable mode. Run them from the
worktree root.

- Under `ap-dev-flow`, use the run folder and worktree it passes. Never create
  another worktree.
- Standalone with a run path or flow id, validate it with
  `bash <skill-directory>/scripts/dev-run-workspace resolve <run>`.
- Standalone with a plan file outside any run, create a run with
  `bash <skill-directory>/scripts/dev-run-workspace new <slug>`, copy the plan
  to `<run>/02-plan.md`, set `goal` and `durable_plan_path` in `meta.yaml`,
  and tell the user the absolute run path.

Standalone invocation uses the current worktree and does not create one. The
readiness gate below requires that worktree to be dedicated to this work.

## Readiness gate

Before dispatching an implementer, verify:

- `02-plan.md` has numbered task headings that `task-brief` can parse, such as
  `### Task 3 — Title` or the older `## Task 3: Title`. For an older plan
  without phases or per-task `verify` lines, treat it as one phase and record a
  `Ruling:` naming each task's verify command and the phase verify, usually the
  repository's standard check; if no credible command exists, stop and suggest
  `ap-dev-plan` to convert the plan;
- the plan is approved. Under `ap-dev-flow`, require `status: approved` (or
  `executing` when resuming) in the plan's frontmatter and stop otherwise.
  Standalone, the user's explicit invocation is the approval: set
  `status: approved` and record that in the ledger. Set `status: executing`
  when Task 1 starts;
- the host exposes subagents with isolated contexts. If it does not, set
  `status: stopped` and `stop_reason: no_subagents` in `meta.yaml` and
  `STATUS.md` and stop. Never fall back to implementing or reviewing in this
  context;
- the directory is a Git worktree with at least one commit, on a feature
  branch rather than the primary branch, and clean before Task 1. If it is the
  user's ordinary checkout or primary branch, stop and recommend
  `ap-start-dev-session` or `ap-dev-flow`; and
- Git can commit without changing repository or global identity.

Record `merge_base` and `base_ref` in `meta.yaml` when they are empty.

## Keep the ledger

Create `<run>/04-implementation-ledger.md` from
[templates/04-implementation-ledger.md](templates/04-implementation-ledger.md)
unless it exists, and record the plan's hash from
`git hash-object <run>/02-plan.md`. On resume, compare the hash first. If the
plan changed, do not continue against the old preflight: stop and ask the user
whether to re-preflight the changed plan. Otherwise trust completed task lines
and recorded commits over conversation memory. Resume at the first incomplete
task or the next recorded repair round. Never redispatch a task marked
complete.

The ledger records the merge base and starting head, the preflight tables,
every ruling, each task's implementer, `base..head`, verify result, review
verdict, reviewer and read-only enforcement, repair rounds, deferred and parked
findings, and one completion line per task. Git history is the implementation
record; the ledger is the decision and recovery record.

Keep `STATUS.md` and `meta.yaml` current: `status: implementing`,
`current_task`, and `last_step`.

## Preflight the plan once

Read `02-plan.md` once, plus any specification it names. Write two tables to
the ledger:

- one row per task checking that its intent, files, and verify command agree;
- one row per task pair that shares a file or interface, naming what the
  earlier task produces and the later one consumes.

Rule on contradictions before Task 1. Treat the plan as immutable while
implementing; record corrections in the ledger, not in `02-plan.md`.

Execute tasks in plan order. `parallel: yes` means order-flexible only: never
run two writable implementers at once in the same worktree.

## Choose subagents portably

Use the provider's native subagent mechanism. Choose capability by role, never
by a hard-coded model name:

- fast or economical for mechanical one- or two-file tasks;
- standard for multi-file integration and debugging;
- highest available for architecture and subtle risk; and
- at least one tier above a stuck implementer for repair rounds 4 and 5.

Implementers get write access to the worktree. Reviewers are read-only:

- when the `ap-code-reviewer` subagent is installed, dispatch it with the
  review prompt as its task;
- otherwise dispatch a fresh generic subagent with the provider's read-only
  restriction when one exists (for example Cursor `readonly` or Claude tool
  grants).

Record the reviewer used. If read-only could only be stated in the prompt,
record `read-only: prompt-level` in the ledger.

### Wait without thrashing

Use the provider's blocking wait with a practical interval. Do not rapidly poll
or narrate unchanged waits. Reconcile every dispatched child before the next
writable dispatch and before finishing.

## Task loop

### 1. Prepare and dispatch

Record `BASE=$(git rev-parse HEAD)`. Generate the brief:

```sh
bash <skill-directory>/scripts/task-brief <run> N
```

It writes `<run>/tasks/task-N-brief.md`. Dispatch a fresh implementer with
[implementer-prompt.md](implementer-prompt.md), giving only one sentence of
context, the brief path, the plan's **Global constraints** verbatim, the
interfaces produced by finished tasks, the rulings that bind this task, and
the report path `<run>/tasks/task-N-report.md`. Never give it the whole plan.
The brief describes behavior, so the implementer chooses the implementation
within those constraints.
Record its identity so repair rounds 1–3 can resume it.

### 2. Handle the implementer status

- `DONE`: continue.
- `DONE_WITH_CONCERNS`: resolve correctness or scope doubts first; ledger
  non-blocking observations.
- `NEEDS_CONTEXT`: supply the missing context and resume it.
- `BLOCKED`: change something material before retrying (context, a more
  capable implementer, a split task, or a ledger correction). Never force an
  unchanged retry.

Confirm `HEAD` advanced and the worktree is clean. Run the task's `verify`
command yourself and record the result. A failing verify goes straight to the
repair loop without review.

### 3. Review the task

Generate the package from the recorded base, never an assumed `HEAD~1`:

```sh
bash <skill-directory>/scripts/review-package <run> BASE HEAD
```

Dispatch a fresh read-only reviewer (never the implementer or a previous
reviewer) with [task-reviewer-prompt.md](task-reviewer-prompt.md), the brief,
the report, the package, the exact SHAs, and the plan's **Global
constraints** and **Review focus** verbatim.

Write its result to `<run>/tasks/review-N-rR.md` using
[templates/task-review.md](templates/task-review.md). Every task review needs
a spec-compliance verdict; when `ap-code-reviewer` runs, ask it to include the
prompt's Spec Compliance section. Map the verdict across both severity scales:

- any Critical finding → `block`;
- spec compliance `ISSUES FOUND` or missing, any Important, High, or Medium
  finding, or a confirmed `Cannot verify from diff` gap → `revise`;
- otherwise → `approve`. Minor and Low findings are recorded as deferred.

### 4. Repair and re-review

A repair round is exactly one implementer repair plus one scoped re-review by
a fresh reviewer. Use at most five rounds per task:

- rounds 1–3 resume the original implementer with every open finding copied
  verbatim;
- rounds 4–5 dispatch a fresh, more capable implementer with the brief, report,
  findings, and prior-attempt count.

Each implementer commits its repair, reruns the task verify, and appends to its
report. Record `FIX_BASE` as the head the prior review saw, package
`FIX_BASE..HEAD`, and dispatch a fresh reviewer with
[re-review-prompt.md](re-review-prompt.md). After every round append:

```text
Task <N>: fix round <R>/5 (<X> addressed, <Y> open; commits <base7>..<head7>)
```

After the fifth re-review, adjudicate each residual finding in the ledger:

- park a false, contestable, or non-load-bearing finding with a ruling;
- for a real load-bearing defect, rule on the smallest correction that keeps
  downstream tasks valid and carry it into the next task; or
- stop only if every correction path is a guess: set `status: stopped` with
  `stop_reason: task_repair_cap` and do not start the next task.

Adjudicate only after round five. Never silently discard a finding.

### 5. Complete the task

When the review approves, or every residual is parked at the breaker, append:

```text
Task <N>: complete (commits <base7>..<head7>, review clean)
Task <N>: complete (commits <base7>..<head7>, <K> parked)
```

Continue with the next task. Do not start a task while the previous one has a
failing verify or an unresolved `revise` or `block`.

## Phase gates

After the last task of a phase completes, run that phase's **Phase verify**
command and record the result in the ledger. Start the next phase only after it
passes.

When it fails, run a phase repair wave: one fresh implementer with the failing
command and output, which commits its fix, then one scoped re-review of the
repair range by a fresh reviewer, then the phase verify again. Completed tasks
stay complete. Append after each wave:

```text
Phase <P>: verify repair <W>/2 (<pass|fail>; commits <base7>..<head7>)
```

Allow at most two waves per phase (`verify_repair_max`). If the phase verify
still fails, set `status: stopped` with `stop_reason: phase_verify_cap` and do
not start the next phase.

## Finish

Under `ap-dev-flow`, return control with the ledger path and final head; the
orchestrator runs integration review and verification.

Standalone, run `ap-dev-review-code` and then `ap-dev-verify` against this run
when they are installed. If one is missing, report its exact component id and
offer the normal Agents Pack install workflow; do not perform its work here.

Report:

- tasks and commits created;
- verification performed and any gaps;
- task review outcomes and repair rounds;
- deferred, parked, or unresolved findings;
- every `Ruling:` line with its cost if wrong; and
- the branch, the absolute worktree path, and the absolute run path.

Leave the run folder in place; `ap-clean-dev-runs` removes old runs. Do not
push, merge, publish, deploy, or open a pull request without separate
authorization.

## Attribution

Adapted from Jesse Vincent's
[Superpowers subagent-driven-development skill](https://github.com/obra/superpowers/tree/b36e0829c6d0140e93cfef2ca599b1b07d4a7797/skills/subagent-driven-development)
at commit `b36e0829c6d0140e93cfef2ca599b1b07d4a7797` (`v6.3.0`). The original is
MIT licensed; see [LICENSE.md](LICENSE.md).
