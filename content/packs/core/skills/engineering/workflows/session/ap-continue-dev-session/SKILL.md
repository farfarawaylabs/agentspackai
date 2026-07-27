---
name: ap-continue-dev-session
description: Resume development safely from a handoff prompt after context was cleared or a session changed. Use when the user says continue or resume our work and provides previous-session context, a handoff summary, current plan, next action, or additional constraints that must be reconciled with the repository and available memory.
---

# Continue a Development Session

Treat text supplied with the invocation as the handoff and additional
instructions for the resumed session.

## Rebuild context

1. Read the entire handoff before acting.
2. Read applicable repository instructions and canonical product, technical,
   TODO, plan, and design documents relevant to the resumed work.
3. Inspect relevant memory when the current host exposes it and access is
   available. Use only memory related to this repository and task. Do not assume
   another agent's memory exists, claim to have read unavailable memory, or let
   memory override explicit user instructions.
4. Verify the repository root, branch, working-tree status, diff, relevant
   files, and recorded test state.
5. Reconcile the handoff against current evidence. Treat it as a useful summary,
   not an infallible source of truth.

Call out material contradictions, missing files, changed branches, unexpected
edits, or stale completion claims before relying on them. Preserve unrelated
user changes.

## Resume instead of restarting

Determine:

- the current goal and acceptance criteria;
- what is demonstrably complete;
- the exact next action;
- unresolved decisions, failures, or risks; and
- which checks must be rerun because context or repository state changed.

Do not redo completed investigation or implementation merely to regain
familiarity. Read the smallest set of relevant files needed to proceed safely.
Do not rerun destructive or externally mutating commands from the handoff
without confirming they remain authorized and necessary.

Briefly state the reconciled goal, current state, and next action, then continue
the work. Do not stop at a summary when the next action is clear and authorized.
If the handoff or invocation does not identify actionable work, ask one concise
question after rebuilding the available context.
