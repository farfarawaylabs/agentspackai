# Agents Pack CLI 0.2.0

- Add `agents-pack mcp add`, `status`, and `remove` for managing user-level
  remote MCP servers across Claude Code, Codex, and Cursor.
- Default MCP operations to all three providers while allowing explicit
  provider selection.
- Add dry-run previews, ownership and drift protection, operation locking,
  interrupted-transaction recovery, and rollback across provider changes.
- Refuse unmanaged provider entries instead of silently adopting or
  overwriting them.
- Document provider-specific authentication boundaries and the remote HTTP
  transport supported by this first release.
