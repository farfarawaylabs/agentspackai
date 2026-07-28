# Agents Pack user guide

Welcome! Agents Pack helps you use the same working practices with Claude Code,
Codex, and Cursor without maintaining three separate copies of everything.

This guide starts with the simplest setup and then covers every current CLI
workflow. You do not need to understand the internal file formats to use
Agents Pack.

> **Pre-release note:** The CLI and core pack are implemented, but the public
> installer and first official pack release are not live yet. Commands in this
> guide use `agents-pack` for readability. See
> [Run the current development build](#run-the-current-development-build) for
> the command prefix and local pack arguments needed before publication.

## Contents

- [The basic idea](#the-basic-idea)
- [Choose repository or global scope](#choose-repository-or-global-scope)
- [Run the current development build](#run-the-current-development-build)
- [Initialize Agents Pack](#initialize-agents-pack)
- [Understand component selection](#understand-component-selection)
- [See what Agents Pack installed](#see-what-agents-pack-installed)
- [Install or remove official components](#install-or-remove-official-components)
- [Create your own skills and subagents](#create-your-own-skills-and-subagents)
- [Customize an official component](#customize-an-official-component)
- [Update Agents Pack content](#update-agents-pack-content)
- [Pin, unpin, and roll back](#pin-unpin-and-roll-back)
- [Remove Agents Pack safely](#remove-agents-pack-safely)
- [Understand safety and ownership](#understand-safety-and-ownership)
- [Command reference](#command-reference)
- [Troubleshooting](#troubleshooting)
- [Frequently asked questions](#frequently-asked-questions)

## The basic idea

Agents Pack manages three kinds of content:

- **Instructions** are durable rules that should guide normal project work.
- **Skills** are focused workflows such as debugging, API development, plan
  review, frontend design, documentation refresh, or security auditing.
- **Subagents** are specialized roles such as code reviewer, backend developer,
  UX enhancer, or researcher.

You choose:

1. where the content should apply;
2. which coding agents you use; and
3. which components you want.

Agents Pack then renders provider-native files for Claude Code, Codex, and
Cursor. It records exactly what it wrote so future updates can be previewed,
validated, applied, or rolled back safely.

## Choose repository or global scope

Agents Pack supports two installation scopes.

### Repository scope

Choose repository scope when the instructions and capabilities belong to one
project.

```text
--scope repository
```

Agents Pack finds the nearest Git repository root. If there is no Git root, it
uses the current directory. State is stored under:

```text
.agents-pack/
```

The generated provider files are also inside the repository. Review them and
normally commit them with the rest of the project so teammates and coding
agents receive the same setup.

Repository scope supports Claude Code, Codex, and Cursor.

### Global scope

Choose global scope when you want the same baseline available across projects:

```text
--scope global
```

State is stored under:

```text
~/.agents-pack/
```

Global scope currently supports Claude Code and Codex. Global Cursor
instructions are not supported yet, so selecting Cursor with global scope
stops before writing anything.

### Do not install both scopes at the same time

The current lifecycle intentionally supports one active Agents Pack scope at a
time. If both global and the current repository are initialized, Agents Pack
reports a scope conflict instead of guessing which one should win.

Start with repository scope if you are unsure. It is easier to inspect, commit,
and remove without affecting unrelated projects.

## Run the current development build

There is no public installer yet. To try the current implementation, clone the
repository and install its dependencies:

```sh
git clone https://github.com/farfarawaylabs/agentspackai.git
cd agentspackai
bun install
```

In the examples below, replace:

```text
agents-pack
```

with:

```text
bun /absolute/path/to/agentspackai/src/cli/main.ts
```

Run that command while your shell is inside the project you want to manage.
This matters because Agents Pack uses the current working directory to find the
repository.

Until the first official pack release is live, add this local pack override to
`init` and `update` commands:

```text
--pack /absolute/path/to/agentspackai/content/packs/core
```

For example:

```sh
cd /path/to/your-project

bun /absolute/path/to/agentspackai/src/cli/main.ts init \
  --scope repository \
  --agents claude,codex,cursor \
  --components recommended \
  --pack /absolute/path/to/agentspackai/content/packs/core \
  --dry-run
```

Once the public CLI and official pack exist, you will be able to use the
shorter commands shown throughout the rest of this guide.

## Initialize Agents Pack

### Interactive setup

From the project you want to configure, run:

```sh
agents-pack init
```

Agents Pack asks you to choose:

- repository or global scope;
- Claude Code, Codex, Cursor, or a supported combination; and
- Recommended, All, or a custom component selection.

It shows the exact selected components and filesystem plan before applying
anything. Pressing Enter at the confirmation prompt does not apply the plan;
you must answer `y` or `yes`.

### Non-interactive setup

To install the recommended repository components for all three agents:

```sh
agents-pack init \
  --scope repository \
  --agents claude,codex,cursor \
  --components recommended \
  --yes
```

For a global Claude Code and Codex installation:

```sh
agents-pack init \
  --scope global \
  --agents claude,codex \
  --components recommended \
  --yes
```

To apply an initialization from a script or another non-interactive shell,
provide the scope, agents, component choice, and `--yes`. Use `--dry-run`
instead of `--yes` when the script should only print the plan.

### Preview first

Content-changing commands support a dry run:

```sh
agents-pack init \
  --scope repository \
  --agents claude,codex,cursor \
  --components recommended \
  --dry-run
```

A dry run loads and validates the pack and prints the same plan, but does not
write provider files, installation state, transaction state, or the pack
cache.

### Use an explicit local pack

`init` normally uses the official registry. For development, private content,
air-gapped work, or the current pre-release build, pass a directory:

```sh
agents-pack init \
  --scope repository \
  --agents claude,codex,cursor \
  --components recommended \
  --pack /path/to/local-pack \
  --yes
```

The installation records whether its source is `official` or `local`. A local
installation never silently switches to the public registry.

## Understand component selection

The core pack labels components as required, recommended, or optional.

### Recommended

```text
--components recommended
```

Installs every required and currently recommended component. This is the best
starting point for most users.

### All

```text
--components all
```

Installs every compatible component in the current pack version.

“All” is a one-time expansion, not a subscription. A new optional component
published later is not silently installed.

### Explicit component IDs

For a small tailored setup:

```text
--components ap-debug,ap-code-reviewer,ap-frontend-design
```

Required components are added automatically even if you do not list them.

### Custom interactive selection

Choose `custom` during interactive initialization. The menu starts with the
Recommended set selected. Enter a component ID or category to toggle it, then
enter `done`.

Required components stay selected. The menu shows each component’s category,
selection level, and short description.

Your final component IDs are stored explicitly. If a component later changes
from optional to recommended, it is not automatically added to an existing
installation. A newly required component may be added during an update, so
required status is reserved for core management behavior.

The complete current catalog is documented in
[`content/README.md`](../content/README.md).

## See what Agents Pack installed

### Check health and drift

Run:

```sh
agents-pack status
```

Status is read-only. It reports:

- repository or global scope;
- pack ID and version;
- official or local source;
- pin state;
- selected agents;
- official and user-owned component names;
- every managed output as clean, missing, modified, or malformed; and
- warnings such as unsynchronized user-owned source.

If a previous mutation was interrupted, status reports that recovery is
required but does not modify anything. Rerun the interrupted mutating command
to let the transaction system recover safely.

### Browse components

List the complete installed pack catalog:

```sh
agents-pack list
```

Useful filters include:

```sh
agents-pack list --installed
agents-pack list --available
agents-pack list --kind skill
agents-pack list --available --kind subagent
```

User-owned components appear in installed listings with a `user-owned` label.

## Install or remove official components

After initialization, you can change the official selection without starting
over.

### Install an available component

```sh
agents-pack install ap-frontend-design --dry-run
agents-pack install ap-frontend-design --yes
```

### Remove an optional component

```sh
agents-pack remove ap-frontend-design --dry-run
agents-pack remove ap-frontend-design --yes
```

Required components cannot be removed. Repeating an install or remove that is
already satisfied is a safe no-op.

These commands use the exact installed pack from the local cache. They do not
contact the registry and do not need the original `--pack` directory.

## Create your own skills and subagents

User-owned components have one canonical source. Edit that source, then run
`sync` to regenerate the Claude Code, Codex, and Cursor copies.

Repository scope stores canonical source under:

```text
.agents-pack/user/
```

Global scope uses:

```text
~/.agents-pack/user/
```

Names you create cannot use the reserved `ap-` prefix.

### Create a skill

```sh
agents-pack create skill deploy-app \
  --description "Deploy this application safely. Use for staging or production deployment." \
  --dry-run

agents-pack create skill deploy-app \
  --description "Deploy this application safely. Use for staging or production deployment." \
  --yes
```

Agents Pack creates a small valid `SKILL.md` scaffold, adds it to the user
catalog, renders it for every selected agent, and records the generated files.

Edit the canonical file:

```text
.agents-pack/user/skills/deploy-app/SKILL.md
```

Then synchronize:

```sh
agents-pack sync --dry-run
agents-pack sync --yes
agents-pack status
```

The required `ap-create-new-skill` skill can guide a coding agent through this
same workflow from inside a chat.

### Create a read-only subagent

```sh
agents-pack create subagent release-checker \
  --description "Review release correctness and operational risk. Use before deployment." \
  --yes
```

New subagents are read-only by default.

### Create a subagent that can edit the workspace

Add `--write` only when the role genuinely needs to change files:

```sh
agents-pack create subagent api-implementer \
  --description "Implement approved API changes. Use after an API plan is accepted." \
  --write \
  --yes
```

The canonical subagent source contains provider-neutral `agent.toml` and
`instructions.md`. Agents Pack renders each provider’s native definition.

### Do not edit generated provider copies

Direct edits to generated Claude, Codex, or Cursor copies are treated as drift
and block synchronization. Make your change under `.agents-pack/user/` or
`~/.agents-pack/user/`, then run `sync`.

## Customize an official component

If an official skill or subagent is close to what you want but should become
your own, fork it:

```sh
agents-pack fork ap-debug --name my-debug --dry-run
agents-pack fork ap-debug --name my-debug --yes
```

Forking:

1. copies the exact installed official source;
2. gives the copy your new user-owned name;
3. records it as a separate user-owned component; and
4. renders the copy for every selected agent.

Future official updates do not overwrite your copy. The original official
component stays installed and continues to receive updates. If you no longer
want the original, remove it separately after the fork:

```sh
agents-pack remove ap-debug --dry-run
agents-pack remove ap-debug --yes
```

Required official components cannot be removed.

Official instruction components cannot be forked. Put repository-specific
instruction additions outside Agents Pack’s managed block or in a user-owned
skill.

## Update Agents Pack content

CLI application updates and content-pack updates are separate. The commands in
this section update instructions, skills, subagents, and their release notes;
they do not update the CLI executable.

### Check for a new official pack

```sh
agents-pack update --check
```

The check downloads and validates the registry’s current candidate, then
reports:

- installed and candidate versions;
- whether an update is available;
- current pin state; and
- candidate release notes.

It does not cache or apply the candidate.

### Preview the exact filesystem changes

```sh
agents-pack update --dry-run
```

### Apply an update

Interactively:

```sh
agents-pack update
```

Non-interactively:

```sh
agents-pack update --yes
```

Agents Pack preserves your explicit component selection. New optional or
recommended components become available but are not silently installed.
User-owned canonical content is not part of the official update.

### Update from a local candidate

For an installation initialized from a local pack:

```sh
agents-pack update --check --pack /path/to/new-local-pack
agents-pack update --pack /path/to/new-local-pack --dry-run
agents-pack update --pack /path/to/new-local-pack --yes
```

`--check` cannot be combined with `--yes` or `--dry-run`.

## Pin, unpin, and roll back

### Keep the current version

```sh
agents-pack pin
```

A pinned installation can still check for updates, install available
components, and remove optional components. Applying a different pack version
stops until you unpin:

```sh
agents-pack unpin
```

`pin` and `unpin` take effect immediately and do not accept `--yes` or
`--dry-run`. Both are idempotent and still validate that managed outputs are
clean.

### Roll back to the newest cached older version

Preview:

```sh
agents-pack rollback --dry-run
```

Apply:

```sh
agents-pack rollback --yes
```

### Roll back to an exact cached version

```sh
agents-pack rollback 0.24.0 --dry-run
agents-pack rollback 0.24.0 --yes
```

Rollback only uses previously cached packs with the same pack ID. It never
downloads a missing historical version.

A successful rollback automatically pins the restored version so a later
update does not immediately undo your decision. Run `agents-pack unpin` when
you are ready to move forward again.

User-owned canonical content is preserved during rollback.

## Remove Agents Pack safely

Always preview removal first:

```sh
agents-pack eject --dry-run
```

Then apply:

```sh
agents-pack eject --yes
```

Eject removes:

- official generated provider files and managed blocks;
- user-generated provider copies;
- the official installation configuration and lock; and
- the user-generated output lock.

Eject preserves canonical user-owned source under `.agents-pack/user/` or
`~/.agents-pack/user/`. You can inspect, archive, or reuse it later.

Eject refuses to delete modified, missing, or malformed managed content. This
is intentional: Agents Pack will not guess whether an unexpected edit is safe
to discard.

## Understand safety and ownership

Agents Pack follows a few simple rules:

- **Preview is honest.** `--dry-run` uses the real planner without writing.
- **Unexpected edits stop the operation.** Agents Pack does not silently merge
  or overwrite drifted generated content.
- **Shared files stay shared.** Codex instructions use a marked block inside
  `AGENTS.md`; text outside that block remains user-owned.
- **Writes are transactional.** A failed operation restores the previous
  filesystem state.
- **Only one mutation runs at a time.** Operation locks prevent concurrent
  commands from writing over one another.
- **Interrupted work is recoverable.** Rerunning a mutating command recovers
  unfinished transaction state before replanning.
- **Paths are contained.** Pack sources and generated paths cannot escape their
  allowed repository or home roots.
- **Symlinks are not adopted as managed outputs.**
- **User-owned canonical source survives official update, rollback, and
  ejection.**

### What files appear?

Repository state appears under `.agents-pack/`. Provider output is rendered
into native locations such as:

```text
.claude/rules/agents-pack/
.claude/skills/
.claude/agents/
AGENTS.md
.agents/skills/
.codex/agents/
.cursor/rules/agents-pack/
.cursor/skills/
.cursor/agents/
```

The exact skill copies depend on the selected agent combination. Agents Pack
may reuse Claude or Codex compatibility roots for Cursor instead of creating a
third identical copy, and it reports discovery warnings when relevant.

Global installations use the corresponding locations under your home
directory. The shared pack cache lives under:

```text
~/.agents-pack/cache/packs/
```

## Command reference

### `init`

```text
agents-pack init \
  --scope <repository|global> \
  --agents <comma-separated-list> \
  --components <recommended|all|comma-separated-ids> \
  [--pack <local-directory>] \
  [--yes] \
  [--dry-run]
```

Interactive use may omit scope, agents, and components. Non-interactive use
must provide them. `--pack` switches initialization from the official registry
to a local directory.

### `status`

```text
agents-pack status
```

Always read-only. Accepts no options.

### `list`

```text
agents-pack list [--installed|--available] [--kind <instruction|skill|subagent>]
```

`--installed` and `--available` cannot be combined.

### `install` and `remove`

```text
agents-pack install <component-id> [--yes] [--dry-run]
agents-pack remove <component-id> [--yes] [--dry-run]
```

Each command accepts exactly one official component ID.

### `create`

```text
agents-pack create skill <name> \
  --description <text> \
  [--yes] \
  [--dry-run]

agents-pack create subagent <name> \
  --description <text> \
  [--write] \
  [--yes] \
  [--dry-run]
```

Interactive use can prompt for a missing description. Non-interactive use
requires `--description`. `--write` is valid only for subagents.

### `fork`

```text
agents-pack fork <official-component-id> \
  --name <user-owned-name> \
  [--yes] \
  [--dry-run]
```

Only official skills and subagents can be forked.

### `sync`

```text
agents-pack sync [--yes] [--dry-run]
```

Requires at least one canonical user-owned component.

### `update`

```text
agents-pack update --check [--pack <local-directory>]
agents-pack update [--pack <local-directory>] [--yes] [--dry-run]
```

Official installations use the registry by default. Local installations
require `--pack`.

### `pin` and `unpin`

```text
agents-pack pin
agents-pack unpin
```

These commands accept no options.

### `rollback`

```text
agents-pack rollback [version] [--yes] [--dry-run]
```

Without a version, chooses the newest cached version older than the installed
version.

### `eject`

```text
agents-pack eject [--yes] [--dry-run]
```

Removes managed output while preserving canonical user-owned source.

## Troubleshooting

### “Agents Pack is not initialized”

Run the command from inside the intended repository, or initialize the desired
scope first:

```sh
agents-pack init
```

### “Agents Pack is installed in both global and current-repository scope”

The current release does not combine scopes. Choose which installation should
remain, move any user-owned canonical source you want to keep, and eject the
other scope.

### A file is reported as modified, missing, or malformed

Agents Pack stopped to protect your work.

1. Run `agents-pack status`.
2. Inspect the reported file or managed block.
3. If you intentionally customized an official skill or subagent, restore the
   generated file, use `agents-pack fork`, and then edit the canonical
   user-owned copy.
4. If it is user-owned, make the change in `.agents-pack/user/` and restore the
   generated copy.
5. Rerun `status`, then retry the command.

Agents Pack does not currently provide an automatic “discard my edits” or
three-way prose merge command.

### “The installed Base is unavailable”

The content-addressed cached pack is missing or unreadable. Component
operations need that exact Base. For a local installation, provide the exact
pack again with `update --pack`. For an official installation, do not manually
delete `~/.agents-pack/cache/packs/`; restore the matching pack before
continuing.

### “This installation uses a local pack”

Updates for a local installation need an explicit candidate:

```sh
agents-pack update --pack /path/to/new-local-pack --dry-run
```

### `REMOTE_ERROR`

Agents Pack could not load the official registry or release artifact. Check
your network connection and try again. During the current pre-release period,
the official registry is not live; use the local core pack override documented
above.

### `PINNED`

The installed version is intentionally fixed. You can still run
`agents-pack update --check`. Run `agents-pack unpin` only when you want to
allow the update.

### “No cached version older than … is available”

Rollback only uses versions previously initialized or successfully applied on
this machine. It does not fetch missing historical packs.

### Global Cursor is rejected

Use Cursor in repository scope, or initialize global scope for Claude Code and
Codex only.

### A previous operation was interrupted

`agents-pack status` reports recovery without changing anything. Rerun the
interrupted mutating command. The command acquires the operation lock, recovers
the unfinished transaction, creates a fresh plan, and continues safely.

## Frequently asked questions

### Will Agents Pack overwrite my existing `AGENTS.md`?

No. Codex instructions are placed inside a clearly marked managed block. Text
outside that block remains yours. A malformed or conflicting block stops the
operation.

### Do I have to install every component?

No. Start with Recommended, choose All, or select exact IDs. You can later use
`list`, `install`, and `remove`.

### Will new recommended components appear automatically?

They appear as available after you update the pack, but are not installed
silently. Your selection is stored as explicit component IDs.

### Can I edit an official skill directly?

You can inspect it, but direct edits to the generated copy are drift. Fork the
official component into a user-owned name, then edit the canonical copy.

### Can a coding agent create a portable skill for me?

Yes. The required `ap-create-new-skill` skill teaches selected agents to create
or update one canonical user-owned skill and synchronize it through the CLI.

### Where should I edit my custom content?

Repository scope:

```text
.agents-pack/user/
```

Global scope:

```text
~/.agents-pack/user/
```

Do not edit the generated provider copies.

### Does rollback change my custom skills or subagents?

No. Rollback changes the official pack and leaves canonical user-owned content
alone.

### Does eject delete my custom source?

No. Eject removes generated copies and lifecycle state but preserves the
canonical user directory.

### Can I work offline?

Yes, with a local pack directory supplied through `--pack`. Official registry
checks and downloads require network access.

### Does `update` update the Agents Pack CLI?

No. It updates the content pack only. CLI self-update behavior has not been
implemented yet.

### Should repository-generated files be committed?

Usually, yes. Review and commit `.agents-pack` state, canonical user-owned
source, and provider files so the repository carries the same setup for other
developers and agents. The user-level cache under `~/.agents-pack/cache/`
should not be committed.

## More documentation

- [Core content catalog](../content/README.md)
- [User-owned component design](./agent-portability/agents-pack-user-components.md)
- [Updates, pinning, and rollback](./agent-portability/agents-pack-version-control.md)
- [Content distribution and publishing](./agent-portability/agents-pack-distribution.md)
- [System design](./agent-portability/agents-pack-system-design.md)
