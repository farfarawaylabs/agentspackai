# Agents Pack

Agents Pack gives Claude Code, Codex, and Cursor a shared set of project
instructions, skills, and subagents. You choose the agents and components you
want once; Agents Pack renders the right files for each provider and keeps
track of what it owns.

> **Pre-release status:** The CLI and first core content pack are implemented,
> but there is no public installer or live official pack release yet. Until the
> first release is published, run the CLI from this repository and use the
> local core pack as shown below.

**New here? Start with the [Agents Pack user guide](./docs/USER_GUIDE.md).**

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
- Interactive selection of agents and components.
- One core instruction set, 24 portable skills, and six native subagents.
- Provider-specific rendering for Claude Code, Codex, and Cursor.
- Safe component installation and removal after initialization.
- Canonical user-owned skills and subagents.
- Forking an official skill or subagent into user ownership.
- Read-only status, drift detection, dry runs, and transactional writes.
- Official pack release notes and update checks.
- Version pinning, local rollback, and safe ejection.
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

## Try the current development build

First clone the repository and install its development dependencies:

```sh
git clone https://github.com/farfarawaylabs/agentspackai.git
cd agentspackai
bun install
```

Then move to the repository you want to initialize. Run the Agents Pack source
CLI by absolute path so the current working directory remains your target
repository:

```sh
cd /path/to/your-project

bun /path/to/agentspackai/src/cli/main.ts init \
  --scope repository \
  --agents claude,codex,cursor \
  --components recommended \
  --pack /path/to/agentspackai/content/packs/core \
  --dry-run
```

Review the plan, then apply it:

```sh
bun /path/to/agentspackai/src/cli/main.ts init \
  --scope repository \
  --agents claude,codex,cursor \
  --components recommended \
  --pack /path/to/agentspackai/content/packs/core \
  --yes
```

After the public CLI and first official pack are released, the equivalent
command will be:

```sh
agents-pack init \
  --scope repository \
  --agents claude,codex,cursor \
  --components recommended \
  --yes
```

The missing `--pack` tells Agents Pack to use the official registry.

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
```

Build the current official pack artifact locally with:

```sh
bun run pack:build
```

The release process and one-time GitHub setup are documented in
[Agents Pack content distribution](./docs/agent-portability/agents-pack-distribution.md).

## Documentation

### For users

- [Complete user guide](./docs/USER_GUIDE.md)
- [Core content catalog](./content/README.md)
- [User-owned components](./docs/agent-portability/agents-pack-user-components.md)
- [Updates, pinning, and rollback](./docs/agent-portability/agents-pack-version-control.md)

### Design and implementation

- [System design](./docs/agent-portability/agents-pack-system-design.md)
- [Lifecycle MVP](./docs/agent-portability/agents-pack-lifecycle-mvp.md)
- [MVP development plan](./docs/agent-portability/agents-pack-mvp-development-plan.md)
- [Component selection and state design](./docs/agent-portability/agents-pack-component-selection-design.md)
- [Official pack distribution and publishing](./docs/agent-portability/agents-pack-distribution.md)

### Validation reports

- [Real-agent conformance — 2026-07-24 to 2026-07-25](./docs/agent-portability/agents-pack-conformance-2026-07-25.md)
- [Lifecycle MVP review](./docs/agent-portability/agents-pack-mvp-review.md)
- [Core content conformance — 2026-07-27](./docs/agent-portability/agents-pack-core-content-conformance-2026-07-27.md)
- [Component-selection conformance — 2026-07-27](./docs/agent-portability/agents-pack-component-selection-conformance-2026-07-27.md)
- [User-owned component conformance — 2026-07-27](./docs/agent-portability/agents-pack-user-components-conformance-2026-07-27.md)
- [Version-control conformance — 2026-07-27](./docs/agent-portability/agents-pack-version-control-conformance-2026-07-27.md)
- [Distribution conformance — 2026-07-27](./docs/agent-portability/agents-pack-distribution-conformance-2026-07-27.md)
