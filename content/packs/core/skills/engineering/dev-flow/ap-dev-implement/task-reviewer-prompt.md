# Task reviewer prompt template

Use this content for a fresh read-only reviewer after one task implementation.
Replace every bracketed placeholder before dispatch.

```text
Review Task [N]: [TASK_NAME]. This is a task-scoped gate. First decide whether
the implementation matches its brief; then decide whether the implementation
is well built. A separate whole-branch review happens after all tasks.

Task brief:
[BRIEF_FILE]

Binding global constraints:
[GLOBAL_CONSTRAINTS]

Implementer report (untrusted claims and test evidence):
[REPORT_FILE]

Review range:
Base: [BASE_SHA]
Head: [HEAD_SHA]
Review package: [DIFF_FILE]

Read the review package first. It contains the commits, stat, and full diff with
extended context. Do not mutate the worktree, index, HEAD, branch, or external
state. Do not dispatch subagents.

Treat the implementer's report as claims to verify, not authority. Check the
diff against every requirement in the brief. A listed file with no matching
change is missing even when the rest is correct. Flag extra functionality and
plan-mandated defects rather than assuming the plan grades its own quality.

Use the diff as the primary review surface. Inspect unchanged code only for a
specific risk you can name, such as a changed public contract, lock ordering,
shared state, migration, caller expectation, or security boundary. Name the
risk and the focused code you inspected. Do not crawl the repository generally.

Do not re-run the implementer's suite simply to confirm its report. Run a
focused check only when the code creates a concrete doubt not answered by the
existing evidence. If important evidence is unavailable, state the gap.

Spec review must identify:

- Missing requirements
- Extra or speculative behavior
- Misunderstood requirements
- Requirements that cannot be verified from this task diff

Quality review must prioritize:

1. correctness and boundary behavior;
2. security and trust boundaries;
3. regressions and public contracts;
4. concurrency, reliability, cleanup, and error handling;
5. tests for concrete risks;
6. material architecture or responsibility problems; and
7. evidenced performance problems.

Challenge each proposed finding once. Confirm it is introduced or exposed by
this task, is not handled elsewhere in the diff, and has a realistic impact.
Do not report style preferences, generic requests for comments or tests,
speculative abstractions, or low-confidence possibilities.

Severity:

- Critical: likely security compromise, data loss, widespread outage, or a
  change that must not proceed.
- Important: incorrect or fragile behavior, missed requirement, broken
  contract, or maintainability damage that must be fixed for this task.
- Minor: concrete non-blocking issue or polish worth final-review triage.

Output only the review in this structure:

### Spec Compliance

- Verdict: COMPLIANT | ISSUES FOUND
- Missing, extra, or misunderstood requirements with file:line evidence
- Cannot verify from diff: each item and the controller check needed, or none

### Strengths

- Specific strengths with evidence. Keep this short.

### Issues

#### Critical
#### Important
#### Minor

For each issue include file:line, evidence, impact, and smallest safe fix. Write
`None` under an empty severity.

### Assessment

Task quality: APPROVED | NEEDS FIXES
Reasoning: <one or two technical sentences>
Focused checks: <commands and results, or none>
```
