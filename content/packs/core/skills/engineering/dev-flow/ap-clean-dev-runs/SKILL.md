---
name: ap-clean-dev-runs
description: List and remove old ap-dev-flow run folders under the current worktree's .agents-pack/runs directory. Shows what would be removed and deletes only after the user confirms. Use when the user asks to clean up, prune, or delete old dev-flow runs or run folders.
---

# Clean dev-flow runs

Run folders hold research, plans, reviews, ledgers, and verification records
under `<worktree-root>/.agents-pack/runs/<flow-id>/`. This skill removes the
ones the user no longer needs. It works only on the current worktree's run
root; other worktrees keep their own runs.

## List first

Find the worktree root with `git rev-parse --show-toplevel` and list the
directories in `.agents-pack/runs/`. For each run, report its flow id,
`status`, `goal`, and `updated_at` from `meta.yaml`, and its size. Report
entries that are not directories or do not look like flow ids, but never
remove them.

By default this is a dry run: propose which runs to remove and why (for
example `done` or `stopped` runs older than the user's threshold) and change
nothing. Treat a run whose status is not `done` or `stopped` as active; propose
it only when the user names it explicitly.

## Remove after confirmation

Remove only runs the user confirmed, one at a time, with the guarded script
from the installed `ap-dev-implement` skill, which sits next to this skill in
the same skills folder:

```sh
bash <skills-directory>/ap-dev-implement/scripts/dev-run-workspace remove <flow-id>
```

The script validates the flow id and refuses symlinked or out-of-worktree
paths. If it refuses, leave the run in place and report the reason. Never
delete with a hand-written `rm`, never remove the `runs` directory or its
`.gitignore`, and never remove a run in another worktree.

If `ap-dev-implement` is not installed, report that exact component id, offer
the normal Agents Pack install workflow, and remove nothing.

## Finish

Report the runs removed, the runs kept, and anything the script refused.
