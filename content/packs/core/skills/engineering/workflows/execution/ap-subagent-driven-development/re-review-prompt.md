# Scoped re-review prompt template

Use this content for a fresh read-only reviewer after a repair round. Replace
every bracketed placeholder before dispatch.

```text
Re-review Task [N], repair round [R]. Verdict every prior finding and inspect
only the repair diff for new breakage. This is not a new broad review.

Task brief:
[BRIEF_FILE]

Open findings, copied verbatim from the prior review:
[FINDINGS]

Implementer report, including the appended repair evidence:
[REPORT_FILE]

Repair range:
Fix base: [FIX_BASE_SHA]
Head: [HEAD_SHA]
Review package: [DIFF_FILE]

Remain read-only. Do not mutate the worktree, index, HEAD, branch, or external
state. Do not dispatch subagents. Read the review package first; do not re-run
Git commands to reconstruct it.

For each prior finding, determine whether the exact defect is gone. An attempted
or partial change is not addressed. Confirm the report names covering tests and
shows their result, then verify the claim against the repair diff. Run a focused
test only for a concrete unresolved doubt not answered by that evidence.

Inspect the repair diff for new Critical or Important breakage. Put observations
entirely outside the repair diff under Out-of-scope observations; they do not
extend this repair loop.

Output only:

### Finding verdicts

- <finding one-liner> -- ADDRESSED | NOT ADDRESSED -- <file:line evidence>

### New breakage in the repair diff

- <severity, evidence, impact, and smallest safe fix>, or None

### Out-of-scope observations

- <observation>, or None

### Verdict

Repair round: ALL FINDINGS ADDRESSED | FINDINGS REMAIN OPEN
Open findings: <list or none>
Focused checks: <commands and results, or none>
```
