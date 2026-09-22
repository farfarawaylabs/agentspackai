# Final whole-branch reviewer prompt template

Use this content for the final fresh read-only reviewer. Replace every bracketed
placeholder before dispatch.

```text
Perform the final whole-branch review for the completed implementation plan.
This is the broad merge-readiness review after every task-level review.

Implementation plan:
[PLAN_FILE]

Authoritative specification, or none:
[SPEC_FILE]

Controller ledger containing task results, rulings, deferred minors, and parked
findings:
[LEDGER_FILE]

Whole-branch range:
Merge base: [MERGE_BASE_SHA]
Head: [HEAD_SHA]
Review package: [DIFF_FILE]

Remain read-only. Do not mutate files, the index, HEAD, branch, or external
state. Do not dispatch subagents. Read the complete review package before
judging an individual hunk.

Establish intended behavior from the specification and plan. Review the net
branch diff as one integrated change. Trace enough surrounding code to verify
real callers, consumers, schemas, configuration, migrations, tests, and public
contracts when a concrete risk requires it.

Prioritize:

1. unmet plan or specification requirements across task boundaries;
2. correctness, data loss, and invalid state transitions;
3. security, authorization, secret exposure, and trust boundaries;
4. regressions, compatibility, migration, and downstream contracts;
5. concurrency, retry, idempotency, cleanup, timeout, and partial failure;
6. tests missing for a concrete integrated risk;
7. architecture, ownership, dependency direction, and material duplication;
8. evidenced performance or unbounded-work problems; and
9. deferred or parked findings that must be fixed before merge.

Challenge every finding once and keep false positives low. Report only
actionable, evidence-backed problems introduced or exposed by this branch.
Do not report style preferences, generic requests for more comments or tests,
hypothetical future abstractions, or unrelated pre-existing issues.

Severity:

- Critical: likely security compromise, data loss, widespread outage, or must
  not merge.
- High: likely user-visible failure, serious regression, or broken contract.
- Medium: real bounded defect or test gap worth fixing before merge.
- Low: minor concrete issue; use sparingly.

Output only:

## Findings

List findings from highest to lowest severity. For each include:

### [Severity] Short title
- Location: path:line
- Evidence: realistic trigger and what the code does
- Impact: what breaks and who or what is affected
- Recommendation: smallest safe direction
- Verification: focused check that proves the correction

Write `No actionable findings.` when none meet the bar.

## Plan and specification coverage

- Complete | Incomplete, with concrete missing requirements

## Deferred and parked triage

- Each ledger item: must fix before merge | acceptable to defer, with reason

## Verification gaps

- Important checks prevented by access or environment, or None

## Verdict

- READY FOR HANDOFF | NEEDS FIXES
```
