# Agents Pack Core 0.33.0

## New: `ap-dev-flow-auto`, the unattended pipeline

- Add `ap-dev-flow-auto`, an optional explicit-only orchestrator that runs the
  same pipeline as `ap-dev-flow` without stopping to ask you anything. It ends
  with the branch pushed and a draft pull request open.
- The review bar is unchanged. Every task still gets a fresh implementer, a
  passing verify command, and an independent read-only review, and the whole
  change still gets an integration review and acceptance verification.
- **A machine gate replaces your plan approval.** The plan passes only when a
  review round returns `ready` with zero blocking findings. Any other verdict
  means the required changes are applied and a new reviewer looks again. If the
  cap is reached without that verdict the run stops with
  `stop_reason: plan_review_cap` rather than implementing an unapproved plan.
- **Open questions are carried, not asked.** Each keeps its assumption and how
  it can be settled, and they are listed on the pull request.
- **Caps are higher in auto:** four rounds for plan review, integration review,
  and verification repair, against two in interactive. The per-task repair
  ladder stays at five rounds in both.
- **A stopped run opens no pull request.** When a cap is exhausted or a defect
  has no credible correction, the branch and run folder are left as they are
  and the stop reason is reported.

### What it is allowed to do

Invoking `ap-dev-flow-auto` by name authorizes it to push the branch it creates
to the default remote and open one draft pull request from it. It does not
merge, publish, deploy, force-push, rewrite remote history, or push to your
primary branch or any branch it did not create. Ask it for no pull request and
it stops at a ready branch, writing the pull request body into the run folder.

Because it cannot ask mid-run, it checks up front that subagents are available
and that `gh` is authenticated, and refuses to start rather than discovering at
the end that it cannot finish.

## Changes to existing dev-flow skills

- The run folder's `meta.yaml` now records `mode` (`interactive` or `auto`), and
  the stage skills read the mode and the caps from that file instead of assuming
  interactive values. New runs created by `ap-dev-flow` still default to
  `interactive` and its caps.
- Both orchestrators reconcile `mode` when resuming a run the other one started,
  so a resumed run does not keep the wrong questioning behavior or caps.
- `ap-review-plan` applies review changes and recognizes an approval gate under
  either orchestrator. Its repair-authorization rule, and those in
  `ap-dev-review-code` and `ap-dev-verify`, key off the invoking orchestrator
  rather than the presence of a run folder, so standalone invocations stay
  report-only.
- Phase-verify repair waves inside `ap-dev-implement` now read
  `verify_repair_max` instead of assuming two.
- `ap-dev-research` no longer asks about blocking open questions under
  `mode: auto`; it records the hypothesis and how each will be learned and sets
  `open_questions_carried`.
- `ap-dev-implement` no longer stops to ask when the plan changed since its
  preflight under `mode: auto`. It re-runs the preflight against the current
  plan and records a ruling, which the orchestrator surfaces on the pull
  request. Interactive runs still ask.
- `ap-dev-review-code` and `ap-dev-verify` now take their round and wave caps
  from `meta.yaml` rather than the interactive default.
- The bundled `dev-run-workspace` script takes an optional mode argument:
  `dev-run-workspace new <slug> auto`. The two-argument form is unchanged and
  still creates an interactive run.

## Still to come

`ap-subagent-driven-development` remains installed as a retired pointer to
`ap-dev-implement`. It will be deleted in a later version. Update the CLI to
0.3.1 or newer before that release so `agents-pack update` removes it cleanly.
