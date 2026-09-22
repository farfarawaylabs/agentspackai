# Implementation ledger

Plan: 02-plan.md
Plan hash: <git hash-object 02-plan.md>
Merge base: <sha>
Starting head: <sha>
Worktree: <absolute path>

## Preflight

| Task | Files / interfaces coherent? | Notes |
|---|---|---|
| 1 | yes | … |

| Pair | Producer → consumer | Notes |
|---|---|---|
| 1→2 | Task 1 writes X; Task 2 reads X | … |

## Rulings

```text
Ruling: <decision> -- <reason> -- <cost if wrong>
```

## Tasks

### Task 1

- implementer: <id>
- base..head: <sha7>..<sha7>
- verify: `…` → pass | fail
- task_review: approve | revise | block
- reviewer: ap-code-reviewer | generic (read-only: enforced | prompt-level)
- repair_rounds: 0
- notes: …

```text
Task 1: complete (commits <base7>..<head7>, review clean)
```

<!-- Other ledger line formats:
Task <N>: fix round <R>/5 (<X> addressed, <Y> open; commits <base7>..<head7>)
Task <N>: complete (commits <base7>..<head7>, <K> parked)
Phase <P>: verify repair <W>/2 (<pass|fail>; commits <base7>..<head7>)
-->

## Deferred and parked findings

- …

## Surprises / plan deviations

- …
