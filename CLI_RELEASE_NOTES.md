# Agents Pack CLI 0.3.1

- `agents-pack update` no longer fails when a newer content pack removes a
  component you had selected. The update succeeds, uninstalls that component's
  managed files, keeps every other selection, and records clean state.
- The update plan and `update --check` warn once for each removed component and
  point to the pack release notes for its replacement.
- Explicit `--add` ids that the candidate pack does not contain are still
  rejected.
- Update the CLI before updating to a content pack that removes components;
  earlier CLIs refuse that update.
