---
name: ap-add-mcp
description: Add, inspect, or remove a user-level remote MCP server across Claude Code, Codex, and Cursor through the Agents Pack CLI. Use when the user asks to connect or configure an MCP server for all coding agents, check cross-provider MCP status, or remove a server previously added by Agents Pack.
---

# Add an MCP Server

Use `agents-pack mcp` as the source of truth. This workflow manages user-level
provider configuration on the machine and does not require an initialized
repository or a prior `agents-pack init`.

Before the first operation, run `agents-pack mcp --help`. If the installed CLI
does not recognize the command, stop and explain that the Agents Pack CLI must
be updated. Do not fall back to provider-file edits.

## Add a remote server

1. Require a short server name and its remote HTTP or HTTPS endpoint. Do not
   guess a missing endpoint or put credentials in the URL.
2. Run `agents-pack mcp status <name>` to inspect existing provider state.
3. Preview the exact mutation:

   ```text
   agents-pack mcp add <name> --url <url> --agents all --dry-run
   ```

4. Use all providers unless the user explicitly requests a subset. For a
   subset, pass a comma-separated `--agents claude,codex,cursor` selection.
5. If the plan matches the user's authorized request, apply it with the same
   arguments and `--yes` instead of `--dry-run`.
6. Run `agents-pack mcp status <name>` and require every selected provider to
   report `clean`.

Report the configured name, normalized URL, selected providers, status, and
any provider that still requires authentication.

## Handle authentication separately

Adding configuration does not authenticate the server. Never copy credentials
between providers or claim that a clean configuration is authenticated. If the
server requires OAuth, explain the provider-specific follow-up printed by the
CLI. Start an interactive login only when the user asks for it.

## Check or remove a managed server

- Inspect all Agents Pack-managed servers with `agents-pack mcp status`.
- Inspect one name with `agents-pack mcp status <name>`.
- Before removal, run
  `agents-pack mcp remove <name> --dry-run`. If the user authorized removal and
  the plan is correct, rerun it with `--yes`, then verify with status.

## Respect lifecycle boundaries

- The current release supports remote HTTP servers, including Streamable HTTP.
  It does not support local stdio servers or remote SSE configuration. Explain
  that limitation instead of editing provider files directly.
- Do not adopt, overwrite, or remove an unmanaged provider entry.
- Treat drift, malformed configuration, unavailable provider CLIs, and pending
  recovery as blockers. Surface the CLI error and do not bypass it with direct
  edits to `~/.claude.json`, `~/.codex/config.toml`, or
  `~/.cursor/mcp.json`.
- Do not run `agents-pack init`; MCP configuration is independent of Agents
  Pack content scope.
