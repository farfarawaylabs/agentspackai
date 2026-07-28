---
name: ap-manage-agents-pack
description: Manage an existing Agents Pack installation and its cross-agent components through the Agents Pack CLI. Use when the user asks to inspect Agents Pack status, list or change official components, create or synchronize user-owned skills or subagents, fork an official component for customization, or understand which files Agents Pack owns. Do not use for ordinary repository dependency or package-manager work.
---

# Manage Agents Pack

Use the Agents Pack CLI as the source of truth. Do not independently edit
generated copies under `.claude/`, `.agents/`, `.codex/`, or `.cursor/`.

## Establish the installed scope

1. Run `agents-pack status`.
2. Run `agents-pack list` when the request depends on available or installed
   components.
3. Stop and explain the error if Agents Pack is not initialized, state is
   malformed, recovery is required, or managed output has drifted. Do not work
   around lifecycle protection by editing generated files.

Use the installation's existing global or repository scope. Do not initialize,
eject, or switch scope unless the user asks.

## Choose the correct operation

| User intent | CLI operation |
|---|---|
| Install an official component | `agents-pack install <ap-name>` |
| Remove an optional official component | `agents-pack remove <ap-name>` |
| Create a new user-owned skill | Use `ap-create-new-skill` |
| Create a user-owned subagent | `agents-pack create subagent <name> --description "<trigger description>"` |
| Customize an official skill or subagent | `agents-pack fork <ap-name> --name <user-name>` |
| Regenerate provider copies after editing canonical user content | `agents-pack sync` |
| Check the official registry for an update | `agents-pack update --check` |
| Check a local candidate pack | `agents-pack update --check --pack <path>` |
| Keep the installed official version | `agents-pack pin` |
| Allow forward official updates | `agents-pack unpin` |
| Restore a cached older official version | `agents-pack rollback [version]` |
| Preview any mutation | Add `--dry-run` |

Official `ap-` components remain controlled by the installed pack. User-owned
names must not use the reserved `ap-` prefix.

Update checks are read-only and should show the proposed version, pin state,
and release notes. A pinned installation rejects a different update until the
user explicitly unpins it. Rollback uses only locally cached versions and pins
the restored version; it never rolls back canonical user-owned content.

## Create or change user-owned content

Canonical user content lives under:

```text
Repository skill:    .agents-pack/user/skills/<name>/
Repository subagent: .agents-pack/user/subagents/<name>/
Global skill:        ~/.agents-pack/user/skills/<name>/
Global subagent:     ~/.agents-pack/user/subagents/<name>/
```

For a new subagent:

1. Choose a short lowercase hyphenated name and a description that states both
   its role and when it should be delegated to.
2. Default to read-only. Add `--write` only when its purpose requires editing
   the workspace.
3. Run `agents-pack create subagent <name> --description "<description>" --yes`.
4. Edit the canonical `agent.toml` and `instructions.md`, not provider copies.
5. Keep the role focused, state explicit boundaries, and define its expected
   output.
6. Run `agents-pack sync --dry-run`, inspect the plan, then
   `agents-pack sync --yes`.

For a fork, run the fork command first, edit only the canonical copy reported
under `.agents-pack/user/`, then synchronize it.

## Apply changes safely

- Preview meaningful changes before applying them.
- Use `--yes` only after the plan matches the user's request.
- Do not modify the canonical user source between approval and application.
- Treat drift, ownership conflicts, and transaction recovery messages as
  blockers requiring investigation.
- After applying, run `agents-pack status` and confirm every generated output
  is clean.
- Report the canonical source path, installed targets, commands run, and any
  provider limitation or warning.

Never claim that a component is portable merely because one provider loaded it.
Agents Pack must render and validate it for every selected target.
