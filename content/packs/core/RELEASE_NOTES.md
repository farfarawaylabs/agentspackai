# Agents Pack Core 0.28.0

- Add the required `ap-add-mcp` skill for managing one user-level remote MCP
  server across Claude Code, Codex, and Cursor through the Agents Pack CLI.
- Guide agents through dry-run, ownership, drift, recovery, verification, and
  provider-specific authentication boundaries.
- Detect an older Agents Pack CLI that does not yet provide `agents-pack mcp`
  and stop with update guidance instead of editing provider files directly.
