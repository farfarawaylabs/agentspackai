---
name: ap-dev-review-code
description: Review the accumulated diff of a phase or whole branch with a fresh read-only reviewer subagent, map findings to approve, revise, or block, and record the round. Use when the user asks for an integration or whole-branch code review of implemented plan work, or when ap-dev-flow reaches its code review stage. Requires subagents. For a quick review of an ordinary diff, use the ap-code-reviewer subagent directly.
---

# Review the integrated change

Task reviews inside `ap-dev-implement` check each task's own diff. This stage
reviews the accumulated change as one unit to catch problems that span tasks.
Both are required in the dev-flow pipeline.

## Establish the range

Treat text supplied with the invocation as a run folder, a commit range, or
review criteria.

- In a dev-flow run, review `merge_base..HEAD` from `meta.yaml`, or the phase
  range the orchestrator passes. Set `status: code_review` in `meta.yaml` and
  `STATUS.md`.
- Otherwise review the range the user names, or the current branch from its
  merge base with the primary branch. Do not create a run folder.

Build the review package with the sibling `ap-dev-implement` script when it is
installed:

```sh
bash <ap-dev-implement-directory>/scripts/review-package <run> MERGE_BASE HEAD
```

Outside a run folder, pass `-` as the run and an explicit output path as the
fourth argument.

## Require subagents

If the host cannot start an isolated subagent, stop and say the review did not
run. Do not review the change in this context. In a run folder, set
`status: stopped` and `stop_reason: no_subagents`.

## Dispatch a fresh reviewer

Each round uses a new subagent that did not write or previously review this
code.

- When the `ap-code-reviewer` subagent is installed, dispatch it with the
  range, package, plan, ledger, and any specification.
- Otherwise dispatch a fresh generic subagent, read-only when the provider
  supports it, with `final-reviewer-prompt.md` from the installed
  `ap-dev-implement` skill. If `ap-dev-implement` is not installed either,
  report `ap-dev-implement` as the missing component and offer the normal
  Agents Pack install workflow.

Record which reviewer ran and whether read-only was enforced by the provider or
stated only in the prompt.

## Map and record the verdict

Map the reviewer's severities:

- any Critical finding → `block`;
- any High or Medium finding → `revise`;
- only Low findings, or none → `approve`.

In a run folder, write `<run>/05-code-reviews/rNN.md` from
[templates/code-review.md](templates/code-review.md) and update
`code_review_round` in `meta.yaml` and `STATUS.md`. Otherwise return the same
content in the conversation.

## Repair waves

Repair only under an orchestrator — any run whose `meta.yaml` carries a `mode`
— or when the user asks for fixes. A repair wave
is one implementer dispatched with the complete finding set, which commits its
repair and reruns the relevant verify commands, followed by one scoped
re-review of `FIX_BASE..HEAD` by a fresh reviewer using
`re-review-prompt.md` from `ap-dev-implement`, with `02-plan.md` (or the
user's plan) as the brief and the previous round's findings. Each re-review is
a new round file, mapped as:

- any new Critical breakage → `block`;
- `FINDINGS REMAIN OPEN`, or new High or Medium breakage → `revise`;
- `ALL FINDINGS ADDRESSED` with only Low or no new breakage → `approve`.

Never repair code in this context.

`integration_review_max` in `meta.yaml` caps the review rounds: two under
`mode: interactive`, four under `mode: auto`. Read the cap from the file rather
than assuming it. When the cap is reached without `approve`, set `status:
stopped` and `stop_reason: integration_review_cap`, keep every artifact, and
report the open findings.

## Finish

Report the verdict, the findings by severity, the reviewer used, the range,
and the round file path. Low findings may be deferred; say which.
