---
name: ap-dev-verify
description: Run a plan's acceptance commands against the finished change and record each command's exit status and output excerpt. Use when the user asks to verify, run acceptance checks for, or confirm completion of implemented plan work, or when ap-dev-flow reaches its verification stage. Not for debugging a specific failure (ap-debug) or exploratory browser testing (ap-test-web-app).
---

# Verify acceptance

Prove the finished change meets the plan's acceptance criteria by running the
plan's commands and recording what actually happened.

## Establish the commands

Treat text supplied with the invocation as a run folder, a plan path, or
commands to run.

- In a dev-flow run, use the **Acceptance checks** in `<run>/02-plan.md` and
  set `status: verifying` in `meta.yaml` and `STATUS.md`.
- Otherwise use the plan or commands the user names. Add the repository's
  standard check or build command when the plan omits it and state that you
  did. Do not create a run folder.

## Run and record

Run every command from the worktree root with fresh output. Do not reuse
earlier results or infer success from a code change. Record each command, its
exit status, and a short excerpt proving the result.

In a run folder, write `<run>/06-verify.md` from
[templates/06-verify.md](templates/06-verify.md) with `status: pass` only
when every command exits successfully. Use `fail` otherwise, and `skipped`
only when a command cannot run in this environment, with the reason. Otherwise
return the same table in the conversation.

This stage runs commands; it does not edit code.

## Repair waves

Repair only under an orchestrator — any run whose `meta.yaml` carries a `mode`
— or when the user asks for fixes. A repair wave is one implementer dispatched
with the failing commands and their output. It commits the fix, then this stage
reruns every acceptance command. `verify_repair_max` in `meta.yaml` caps the
waves: two under `mode: interactive`, four under `mode: auto`. Read the cap from
the file rather than assuming it. When the cap is reached with failures, set
`status: stopped` and `stop_reason: verify_repair_cap` and keep every artifact.

## Finish

Report each command's result, any skipped command and why, and the path of
`06-verify.md`.
