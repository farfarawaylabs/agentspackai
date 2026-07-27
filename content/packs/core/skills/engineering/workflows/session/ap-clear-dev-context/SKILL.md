---
name: ap-clear-dev-context
description: Prepare a detailed, paste-ready development handoff prompt before the conversation context is cleared. Use when the user wants to clear, reset, compact, or restart context without losing current progress, decisions, repository state, mistakes, verification results, or the exact next development action.
---

# Prepare a Context Handoff

Treat any text supplied with the invocation as additional context to preserve or
as instructions about the handoff's scope and emphasis.

This skill prepares the handoff. It does not clear the conversation. Do not run
a built-in clear or reset command, and do not claim the context was cleared.

## Reconstruct the current state

Use the conversation and inspect the repository rather than relying on memory
alone. Check relevant:

- repository instructions and product or technical context;
- current branch, working-tree status, and uncommitted changes;
- task plan and TODO state;
- files added, changed, deleted, or intentionally left untouched;
- decisions, constraints, user preferences, and rejected alternatives;
- commands, tests, builds, and other verification actually run;
- errors, failed approaches, and unresolved uncertainty; and
- the exact next action and its prerequisites.

Distinguish verified repository state from conversational recollection. Do not
invent completion, test results, paths, commands, decisions, or rationale.

## Write the handoff prompt

Return one self-contained prompt that a new context can act on. Include only
sections that carry useful information:

```text
Goal
Product and repository context
User requirements and constraints
Work completed
Current implementation and working-tree state
Important files and code paths
Decisions and rejected alternatives
Verification performed and results
Known issues, failed attempts, and uncertainties
Exact next action
Commands or checks to run next
```

Instruct the next context to:

- read the applicable repository instructions and canonical project-context
  documents;
- inspect available relevant memory when the host supports it;
- verify the handoff against the current branch, diff, and files before acting;
- preserve unrelated user changes; and
- continue from the next action rather than repeating completed work.

Keep the prompt detailed enough to resume safely but smaller than the context it
replaces. Summarize long logs and diffs; retain exact error text or code only
when it is necessary to continue.

Exclude secrets, credentials, private tokens, unnecessary personal data, and
speculation. Do not write a handoff file or save memory unless the user
explicitly requests it.

Output the paste-ready prompt in a single fenced block with no essential
instructions outside it.
