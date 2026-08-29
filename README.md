# Agents Pack

Agents Pack gives Claude Code, Codex, and Cursor a shared set of project
instructions, skills, and subagents. You choose the agents and components you
want once; Agents Pack renders the right files for each provider and keeps
track of what it owns.

**New here?** Read the [official docs](https://agentspack.ai) (install, guides, skill catalog, and CLI reference). The in-repo [user guide](./docs/USER_GUIDE.md) remains available as a deep reference.

## NEW: Portable project memory

Claude Code, Codex, and Cursor can now recall and save the same project
knowledge as ordinary Markdown under `.agents-pack/memory/`. Shared memory is
reviewable in Git by default, project-local preferences stay ignored, and
cleanup runs only when you explicitly request it. [Learn how portable project
memory works](./docs/agent-portability/agents-pack-portable-memory.md).

## Install

Agents Pack supports macOS and Linux on ARM64 and x64. The installer downloads
one standalone executable, verifies its SHA-256 checksum, and places it under
`~/.local/bin` without `sudo`:

```sh
curl -fsSL https://farfarawaylabs.github.io/agentspackai/install.sh | sh
```

Then verify the command:

```sh
agents-pack --version
```

If `~/.local/bin` is not already on your `PATH`, the installer prints the exact
line to add. See the [installation guide](./docs/USER_GUIDE.md#install-agents-pack)
for custom directories, exact-version installation, upgrades, and source
development.

## Why Agents Pack?

Coding agents become much more useful after you teach them how you work. The
problem is that each agent expects its instructions, skills, and subagents in
different places and formats.

Agents Pack keeps one maintained content pack and adapts it for:

- Claude Code;
- Codex; and
- Cursor.

It also lets you create repository-specific or user-wide skills and subagents
once, then synchronize them across every selected agent.

## What is implemented

- Repository-wide or global installation.
- Standalone macOS and Linux executables with a checksum-verifying installer.
- Interactive selection of agents and components.
- One core instruction set, 28 portable skills, and six native subagents.
- Automatic recall and capture of repository-owned memory across supported
  coding agents, plus user-invoked maintenance.
- Provider-specific rendering for Claude Code, Codex, and Cursor.
- Safe component installation and removal after initialization.
- Canonical user-owned skills and subagents.
- Forking an official skill or subagent into user ownership.
- Read-only status, drift detection, dry runs, and transactional writes.
- Official pack release notes and update checks.
- Version pinning, local rollback, and safe ejection.
- User-level remote MCP server management across Claude Code, Codex, and Cursor.
- A static registry and GitHub Release workflow for official pack delivery.

Global scope currently supports Claude Code and Codex. Global Cursor
instructions are not supported yet; Cursor can be selected in repository
scope.

## How the ownership model works

Agents Pack separates content into two groups:

| Content | Editable source | Updated by |
|---|---|---|
| Official `ap-` components | The installed core pack | `update`, `install`, and `remove` |
| User-owned components | `.agents-pack/user/` or `~/.agents-pack/user/` | You, followed by `agents-pack sync` |

Generated provider files are not the editable source. Agents Pack records their
hashes and refuses to overwrite unexpected edits, missing files, malformed
managed blocks, or path conflicts.

## Initialize a project

Move into the project you want to configure, then start the interactive setup:

```sh
cd /path/to/your-project
agents-pack init
```

Use the arrow keys to move through each menu. Press Space to toggle agents or
components, and Enter to confirm the visible selection. Repository scope,
all compatible agents, and the recommended component set are selected by
default.

Or initialize non-interactively:

```sh
agents-pack init \
  --scope repository \
  --agents all \
  --components recommended \
  --yes
```

Without `--pack`, Agents Pack downloads the current official content pack.

## Commands at a glance

| Command | Purpose |
|---|---|
| `agents-pack init` | Initialize repository or global scope |
| `agents-pack status` | Inspect the installation and detect drift |
| `agents-pack list` | List installed or available components |
| `agents-pack install <id>` | Install an available official component |
| `agents-pack remove <id>` | Remove an optional official component |
| `agents-pack create skill <name>` | Create a canonical user-owned skill |
| `agents-pack create subagent <name>` | Create a canonical user-owned subagent |
| `agents-pack fork <id> --name <name>` | Copy an official skill or subagent into user ownership |
| `agents-pack sync` | Regenerate provider copies from user-owned source |
| `agents-pack update --check` | Check the official registry without writing |
| `agents-pack update` | Preview or apply a content-pack update |
| `agents-pack pin` | Keep the currently installed pack version |
| `agents-pack unpin` | Allow forward updates again |
| `agents-pack rollback [version]` | Restore an older pack from the local cache |
| `agents-pack eject` | Safely remove managed outputs |
| `agents-pack mcp add <name> --url <url>` | Add a user-level remote MCP server across providers |
| `agents-pack mcp status [name]` | Inspect managed MCP configuration and drift |
| `agents-pack mcp remove <name>` | Remove a managed MCP server from its original providers |

Run `agents-pack <command> --help` for the exact options. When running from
source, replace `agents-pack` with:

```text
bun /path/to/agentspackai/src/cli/main.ts
```

## Content and files

The editable first-party content lives under
[`content/packs/core/`](./content/packs/core/). The
[`content catalog`](./content/README.md) describes the included instructions,
skills, and subagents.

Repository installations keep readable state under `.agents-pack/`. Global
installations use `~/.agents-pack/`. Generated Claude, Codex, and Cursor files
remain in their native provider directories.

Agents Pack stores the exact installed pack in a user-level,
content-addressed cache. This lets component operations and rollback work
without the original source directory.

## Development

The project currently uses Bun and TypeScript:

```sh
bun install
bun run check
bun run cli --help
bun run cli:build
```

Build the current official pack artifact locally with:

```sh
bun run pack:build
```

The release process and one-time GitHub setup are documented in
[Agents Pack content distribution](./docs/agent-portability/agents-pack-distribution.md).
Standalone CLI releases and the installer are documented in
[Agents Pack CLI distribution](./docs/agent-portability/agents-pack-cli-distribution.md).

## Documentation

### For users

- [Complete user guide](./docs/USER_GUIDE.md)
- [Skill catalog](./docs/SKILLS.md)
- [Core content catalog](./content/README.md)
- [Portable project memory](./docs/agent-portability/agents-pack-portable-memory.md)
- [User-owned components](./docs/agent-portability/agents-pack-user-components.md)
- [Updates, pinning, and rollback](./docs/agent-portability/agents-pack-version-control.md)

### Design and implementation

- [System design](./docs/agent-portability/agents-pack-system-design.md)
- [Lifecycle MVP](./docs/agent-portability/agents-pack-lifecycle-mvp.md)
- [MVP development plan](./docs/agent-portability/agents-pack-mvp-development-plan.md)
- [Component selection and state design](./docs/agent-portability/agents-pack-component-selection-design.md)
- [Official pack distribution and publishing](./docs/agent-portability/agents-pack-distribution.md)
- [CLI distribution and installer](./docs/agent-portability/agents-pack-cli-distribution.md)

### Validation reports

- [Real-agent conformance — 2026-07-24 to 2026-07-25](./docs/agent-portability/agents-pack-conformance-2026-07-25.md)
- [Lifecycle MVP review](./docs/agent-portability/agents-pack-mvp-review.md)
- [Core content conformance — 2026-07-27](./docs/agent-portability/agents-pack-core-content-conformance-2026-07-27.md)
- [Component-selection conformance — 2026-07-27](./docs/agent-portability/agents-pack-component-selection-conformance-2026-07-27.md)
- [User-owned component conformance — 2026-07-27](./docs/agent-portability/agents-pack-user-components-conformance-2026-07-27.md)
- [Version-control conformance — 2026-07-27](./docs/agent-portability/agents-pack-version-control-conformance-2026-07-27.md)
- [Distribution conformance — 2026-07-27](./docs/agent-portability/agents-pack-distribution-conformance-2026-07-27.md)
