# Agents Pack CLI 0.3.0

- Add an optional-category selection step to interactive Recommended setup.
- Group Custom setup and new-component update choices by category, with whole-category
  and individual selection for skills, subagents, and instructions.
- Offer newly introduced compatible components during interactive content updates,
  preserving existing selections and previously declined components.
- Add `agents-pack update --add <id,id>` for explicit additions, including scripts
  and dry runs. `--yes` keeps existing choices unless additions are requested.
- Show newly introduced components in `update --check` and `--dry-run`.
- Apply the version change and selected additions in one transaction, with
  cancellation, drift, ownership, and rollback protections.
