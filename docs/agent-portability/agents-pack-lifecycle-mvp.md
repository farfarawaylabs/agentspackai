# Agents Pack lifecycle MVP

**Status:** Implemented and validated as an internal prototype  
**Last updated:** 2026-07-25  
**Purpose:** Define the smallest vertical slice that proves Agents Pack can install, inspect, update, and remove managed content safely.

**Development plan:** [Agents Pack MVP development plan](./agents-pack-mvp-development-plan.md)
**Final review:** [Agents Pack lifecycle MVP review](./agents-pack-mvp-review.md)

> **Historical scope:** This document specifies the deliberately stub-only
> lifecycle prototype completed on 2026-07-25. The repository now also contains
> the real `agents-pack-core` content pack and native subagent rendering. See
> [core content conformance](./agents-pack-core-content-conformance-2026-07-27.md),
> [component-selection conformance](./agents-pack-component-selection-conformance-2026-07-27.md),
> and [user-owned components](./agents-pack-user-components.md) for the
> completed follow-up milestones.

This is not the first public release. It is an internal lifecycle prototype.

The content will be intentionally fake. We will replace it after the management model works.

## 1. What this MVP must prove

The prototype answers six questions:

1. Can Agents Pack install files in either global or repository scope?
2. Can one canonical component be rendered into the relevant Claude, Codex, and Cursor formats?
3. Can Agents Pack update its own files without changing user-owned content?
4. Can it detect when someone edited managed content?
5. Can an interrupted or invalid update leave the previous installation intact?
6. Can Agents Pack remove what it owns without deleting anything else?

If these work, we have validated the foundation on which real skills, subagents, commands, a registry, and a desktop app can be built.

## 2. The deliberate cuts

The MVP contains:

- one stub always-on instruction;
- one stub skill;
- two local versions of the stub content pack;
- global and repository installation scopes;
- Claude Code, Codex, and Cursor repository adapters;
- Claude Code and Codex global adapters;
- a lockfile with hashes;
- `init`, `status`, `update`, and `eject`; and
- automated filesystem tests plus manual agent smoke tests.

The MVP does not contain:

- real best-practice content;
- subagents;
- separate slash-command components;
- user-created or forked components;
- plugins, hooks, MCP servers, or executable skill scripts;
- a remote registry;
- network downloads;
- package signing;
- update channels;
- hybrid global and repository mode;
- global Cursor rules;
- automatic rollback as a user-facing command;
- a desktop application;
- session-log analysis; or
- Windows or Linux support.

The prototype runs on macOS first. Its filesystem code should still avoid unnecessary platform assumptions.

## 3. The four commands

Only four commands are needed.

### 3.1 `init`

```text
agents-pack init \
  --scope repository \
  --agents claude,codex,cursor \
  --pack ./fixtures/packs/0.1.0
```

Interactive use asks for scope and target agents. Tests use flags.

`init`:

1. resolves the installation paths;
2. checks for scope conflicts;
3. loads and validates the local pack;
4. renders all desired outputs in memory;
5. inspects existing target files;
6. displays the installation plan;
7. writes after confirmation;
8. writes configuration and the lockfile last; and
9. prints a summary.

For automated tests:

```text
agents-pack init ... --yes
```

Running the exact same `init` twice against a clean installation should be a no-op. If the requested scope, pack, or targets differ, it should stop and tell the user to use the appropriate lifecycle command rather than silently reconfigure the installation.

For repository scope, the root is the nearest Git repository root. If the current folder is not inside a Git repository, the current folder is the root. Global scope resolves from the user's home directory.

### 3.2 `status`

```text
agents-pack status
```

`status` reports:

- detected scope;
- installed pack ID and version;
- selected agents;
- managed files and blocks;
- whether each item is clean, missing, or modified; and
- any known adapter limitation.

It is read-only.

Example:

```text
Agents Pack

Scope: repository
Pack: agents-pack-smoke@0.1.0
Agents: claude, codex, cursor

Managed:
  clean  .claude/rules/agents-pack/smoke.md
  clean  AGENTS.md#agents-pack
  clean  .cursor/rules/agents-pack/smoke.mdc
  clean  .claude/skills/agents-pack-smoke-test/SKILL.md
  clean  .agents/skills/agents-pack-smoke-test/SKILL.md

Warnings:
  Cursor may discover the skill through more than one compatibility root.
```

### 3.3 `update`

Preview:

```text
agents-pack update \
  --pack ./fixtures/packs/0.2.0 \
  --dry-run
```

Apply:

```text
agents-pack update \
  --pack ./fixtures/packs/0.2.0
```

`update`:

1. loads current configuration and lock state;
2. loads the proposed local pack;
3. validates and renders the new outputs in memory;
4. checks current managed content against the installed hashes;
5. stops if any managed item is missing, malformed, or modified;
6. shows the exact update plan;
7. makes a temporary backup;
8. applies all changes atomically;
9. validates the completed installation;
10. writes the new configuration and lockfile; and
11. removes the temporary backup only after success.

`--dry-run` performs steps 1–6 and does not write anything.

The first MVP does not resolve drift. It reports the changed paths and stops. Restore, fork, pin, and stop-managing flows come after the lifecycle is proven.

### 3.4 `eject`

Preview:

```text
agents-pack eject --dry-run
```

Apply:

```text
agents-pack eject
```

`eject`:

1. loads the lockfile;
2. verifies that managed files and blocks are unchanged;
3. shows what it will remove;
4. removes complete managed files;
5. removes only the Agents Pack block from a shared `AGENTS.md`;
6. preserves all text outside the block;
7. removes empty Agents Pack-created directories where safe;
8. removes Agents Pack scope state last; and
9. prints a summary.

If managed content has drifted, `eject` stops instead of deleting it.

## 4. Local fixture packs

The CLI does not contact a server in this MVP.

The repository contains two immutable fixture packs:

```text
fixtures/
└── packs/
    ├── 0.1.0/
    │   ├── pack.toml
    │   ├── instructions/
    │   │   └── smoke.md
    │   └── skills/
    │       └── agents-pack-smoke-test/
    │           └── SKILL.md
    └── 0.2.0/
        ├── pack.toml
        ├── instructions/
        │   └── smoke.md
        └── skills/
            └── agents-pack-smoke-test/
                └── SKILL.md
```

Version `0.2.0` changes both stub components. This gives `update` something visible and deterministic to replace.

### 4.1 Minimal pack manifest

```toml
schema_version = 1
id = "agents-pack-smoke"
version = "0.1.0"

[[components]]
id = "instruction.smoke"
kind = "instruction"
source = "instructions/smoke.md"
targets = ["claude", "codex", "cursor"]

[[components]]
id = "skill.smoke"
kind = "skill"
source = "skills/agents-pack-smoke-test"
targets = ["claude", "codex", "cursor"]
```

The manifest intentionally omits dependencies, permissions, channels, migrations, and target overrides.

### 4.2 Stub instruction behavior

The version `0.1.0` instruction should contain a harmless, observable rule:

```md
# Agents Pack smoke-test instruction

When the user asks for the Agents Pack smoke-test version, answer
`agents-pack-instruction-v1`.
```

Version `0.2.0` changes the answer to:

```text
agents-pack-instruction-v2
```

### 4.3 Stub skill behavior

Version `0.1.0`:

```md
---
name: agents-pack-smoke-test
description: Report the installed Agents Pack smoke-test skill version.
---

# Agents Pack smoke test

When invoked, respond with `agents-pack-skill-v1`.
```

Version `0.2.0` changes the response to:

```text
agents-pack-skill-v2
```

The skill has no scripts, references, assets, or agent-specific extensions.

## 5. Repository-mode outputs

For all three targets, repository initialization creates:

```text
repository/
├── .agents-pack/
│   ├── pack.toml
│   └── lock.json
├── AGENTS.md
├── .agents/
│   └── skills/
│       └── agents-pack-smoke-test/
│           └── SKILL.md
├── .claude/
│   ├── rules/
│   │   └── agents-pack/
│   │       └── smoke.md
│   └── skills/
│       └── agents-pack-smoke-test/
│           └── SKILL.md
└── .cursor/
    └── rules/
        └── agents-pack/
            └── smoke.mdc
```

Target behavior:

| Target | Instruction output | Skill output |
|---|---|---|
| Claude Code | `.claude/rules/agents-pack/smoke.md` | `.claude/skills/agents-pack-smoke-test/SKILL.md` |
| Codex | Managed block in root `AGENTS.md` | `.agents/skills/agents-pack-smoke-test/SKILL.md` |
| Cursor | `.cursor/rules/agents-pack/smoke.mdc` | Use the placement matrix below |

For this prototype, when all three targets are enabled, no third skill copy is written for Cursor. `status` reports that Cursor may discover both the Claude and Codex copies. Runtime collision behavior remains a conformance question.

To verify each agent independently, manual smoke tests should use three separate temporary repositories, each initialized for only one target.

Cursor skill placement is deterministic:

| Selected targets | Cursor uses |
|---|---|
| Cursor only | `.cursor/skills/agents-pack-smoke-test/` |
| Cursor and Claude | Claude's `.claude/skills/agents-pack-smoke-test/` compatibility copy |
| Cursor and Codex | Codex's `.agents/skills/agents-pack-smoke-test/` compatibility copy |
| Cursor, Claude, and Codex | Both required native copies exist; write no Cursor copy and report possible duplicate discovery |

This is a temporary MVP policy, not a claim about Cursor's same-name collision behavior.

### 5.1 Cursor rule rendering

The Cursor adapter wraps the canonical Markdown in minimal always-active rule metadata:

```mdc
---
alwaysApply: true
---

# Agents Pack smoke-test instruction

When the user asks for the Agents Pack smoke-test version, answer
`agents-pack-instruction-v1`.
```

### 5.2 Codex managed block

If `AGENTS.md` does not exist, Agents Pack creates it.

If it exists, Agents Pack appends one block while preserving the existing bytes outside the insertion boundary:

```md
<!-- agents-pack:start id=instruction.smoke version=0.1.0 -->
# Agents Pack smoke-test instruction

When the user asks for the Agents Pack smoke-test version, answer
`agents-pack-instruction-v1`.
<!-- agents-pack:end id=instruction.smoke -->
```

The lockfile hashes the complete owned insertion segment, not the entire `AGENTS.md`. In an initially empty file, that is the region from the opening marker through the closing marker. In a non-empty shared file, it also includes the two-newline separator inserted immediately before the opening marker. This detects edits to the separator, body, or marker metadata while allowing user edits elsewhere.

If either marker already exists without a matching Agents Pack lockfile, `init` stops. It does not adopt or guess ownership.

## 6. Global-mode outputs

The global prototype supports Claude Code and Codex.

```text
~/
├── .agents-pack/
│   ├── config.toml
│   └── lock.json
├── .agents/
│   └── skills/
│       └── agents-pack-smoke-test/
│           └── SKILL.md
├── .claude/
│   ├── rules/
│   │   └── agents-pack/
│   │       └── smoke.md
│   └── skills/
│       └── agents-pack-smoke-test/
│           └── SKILL.md
└── .codex/
    └── AGENTS.md
```

`~/.codex/AGENTS.md` uses the same managed-block rules as repository `AGENTS.md`.

Global Cursor initialization is rejected with a clear message:

```text
Global Cursor instructions are not supported by the lifecycle MVP.
Use repository scope or select Claude and/or Codex.
```

This is an explicit product limitation, not a silent partial installation.

Filesystem operations must receive the user home directory through an injectable path context. Production supplies the real home directory; tests supply a temporary directory. Tests must never write to the developer's actual agent configuration.

## 7. Minimal state files

### 7.1 Scope configuration

Repository `.agents-pack/pack.toml` and global `~/.agents-pack/config.toml` use the same minimal fields:

```toml
schema_version = 1
scope = "repository"
pack_id = "agents-pack-smoke"
pack_version = "0.1.0"
targets = ["claude", "codex", "cursor"]
```

The MVP does not store an update channel or remote source.

### 7.2 Lockfile

Proposed minimal shape:

```json
{
  "schemaVersion": 1,
  "pack": {
    "id": "agents-pack-smoke",
    "version": "0.1.0",
    "sha256": "sha256:pack-hash"
  },
  "outputs": [
    {
      "componentId": "instruction.smoke",
      "adapter": "claude",
      "kind": "file",
      "path": ".claude/rules/agents-pack/smoke.md",
      "sha256": "sha256:file-hash"
    },
    {
      "componentId": "instruction.smoke",
      "adapter": "codex",
      "kind": "managed-block",
      "blockId": "instruction.smoke",
      "path": "AGENTS.md",
      "sha256": "sha256:managed-region-hash"
    }
  ]
}
```

Every path is relative to the selected scope root. Global mode resolves relative paths against the injected user home.

The lockfile records one output entry for every managed file or block.

File and managed-region hashes use the exact bytes written to disk. The pack hash is deterministic: sort all pack file paths lexicographically, then hash each relative path and its exact file bytes with unambiguous length framing.

## 8. Planning before writing

All mutating commands use the same internal sequence:

```mermaid
flowchart LR
    A["Load state"] --> B["Inspect filesystem"]
    B --> C["Render desired state in memory"]
    C --> D["Build change plan"]
    D --> E["Show or approve plan"]
    E --> F["Apply atomically"]
    F --> G["Validate"]
    G --> H["Write state last"]
```

The planner produces operations such as:

- create directory;
- create managed file;
- replace managed file;
- insert managed block;
- replace managed block;
- remove managed file;
- remove managed block; and
- remove empty directory.

The dry-run and real command use the same plan. Dry-run simply does not apply it.

This shared planner is the most important internal boundary in the prototype.

## 9. Conflict and drift rules

The MVP uses conservative behavior.

| Situation | Result |
|---|---|
| Target file is absent | Create it. |
| Agents Pack file exists and matches its lock hash | Replace or remove as planned. |
| Agents Pack file exists but differs from its lock hash | Stop with drift error. |
| Shared `AGENTS.md` exists without Agents Pack markers | Insert the block and preserve existing content. |
| Shared `AGENTS.md` contains one valid, locked block | Replace or remove only that block. |
| Markers are missing, duplicated, nested, or malformed | Stop with marker error. |
| Exact target path already contains an unowned file | Stop with ownership conflict. |
| User changes text outside the managed block | Continue; that text is user-owned. |
| Global and repository Agents Pack scopes would both be active | Stop with scope conflict. |

There is no `--force` in the MVP. Forcing ambiguous ownership would weaken the behavior we are trying to validate.

When inserting into a non-empty `AGENTS.md`, the block writer owns a standard two-newline separator plus the marked block. If that separator is missing or modified, the block is malformed and update or ejection stops. A clean ejection removes the full owned segment and restores the original surrounding bytes exactly.

## 10. Atomic update behavior

An update is all-or-nothing.

Before applying a plan, the updater:

1. acquires an exclusive lock for the selected scope;
2. creates a persistent transaction journal;
3. captures every file it may modify in a transaction directory;
4. records the intended operations;
5. marks the journal as `applying`; and
6. begins atomic per-file replacements.

Only one mutating command may hold the scope lock. Another mutating process stops without writing.

The lock is `<scope-root>/.agents-pack.operation.lock`. It is created exclusively and records the process ID, command, start time, and transaction ID.

New files are written to temporary sibling files and validated before replacement. Existing shared-file permissions are preserved.

If any operation or final validation fails:

1. restore all touched files from the transaction snapshot;
2. remove files created by the failed transaction;
3. leave the old configuration and lockfile unchanged; and
4. return a non-zero exit code with the failing operation.

The transaction directory can be deleted after success.

If the process terminates before cleanup, the journal remains. The next mutating command detects it, restores the previous state, and then starts a new plan. `status` stays read-only: it reports that recovery is required but does not perform it.

Pack sources and output paths are resolved canonically before planning. They may not escape their pack or scope roots. The MVP never creates symlinks; an existing final-path symlink is treated as an ownership conflict.

A permanent rollback history and a user-facing `rollback` command are deferred.

## 11. Automated acceptance tests

All integration tests use temporary repositories and injected temporary home directories.

### 11.1 Repository initialization

1. Initialize an empty repository with pack `0.1.0`.
2. Confirm expected files and managed block exist.
3. Confirm configuration and lockfile contain correct scope, version, targets, paths, and hashes.
4. Run the same command again.
5. Confirm it is a no-op.

### 11.2 Preserve existing `AGENTS.md`

1. Create an `AGENTS.md` with user text.
2. Initialize Codex repository mode.
3. Confirm every original byte remains outside the new managed block.
4. Edit the user text.
5. Confirm `status` still reports the managed block as clean.

### 11.3 Clean update

1. Initialize pack `0.1.0`.
2. Preview update to `0.2.0`.
3. Confirm dry-run changes no files.
4. Apply the update.
5. Confirm stub rules and skills contain version 2.
6. Confirm user text outside `AGENTS.md` markers remains unchanged.
7. Confirm the lockfile now records `0.2.0`.

### 11.4 Managed-file drift

1. Initialize pack `0.1.0`.
2. Edit a managed Claude rule or skill.
3. Attempt update to `0.2.0`.
4. Confirm the command fails before writing.
5. Confirm every file and the lockfile still contain version 1.

### 11.5 Managed-block drift

1. Initialize Codex into an existing `AGENTS.md`.
2. Edit text inside the Agents Pack block.
3. Attempt update and eject.
4. Confirm both commands stop.
5. Confirm user text outside the block remains unchanged.

### 11.6 Atomic failure

1. Initialize pack `0.1.0`.
2. Inject a controlled failure after at least one update operation.
3. Attempt update to `0.2.0`.
4. Confirm all managed content and state return to version 1.
5. Confirm no temporary output remains in target directories.

### 11.7 Ejection

1. Initialize into a repository with pre-existing `AGENTS.md` content.
2. Preview ejection and confirm no writes.
3. Apply ejection.
4. Confirm managed files and the block are gone.
5. Confirm pre-existing text remains.
6. Confirm Agents Pack scope state is gone.

### 11.8 Global isolation

1. Supply a temporary user home to the path resolver.
2. Initialize global Claude and Codex.
3. Confirm all writes remain beneath that temporary home.
4. Confirm repository paths and the real user home are untouched.
5. Update and eject the global installation.

### 11.9 Scope conflict

1. Initialize global mode in the temporary home.
2. Attempt repository initialization beneath it.
3. Confirm the command stops without writing.
4. Repeat in the opposite direction.

The MVP checks the global state and the current repository only. It does not scan the computer for Agents Pack installations in unrelated repositories.

### 11.10 Concurrent operation

1. Start one mutating command and hold its operation lock.
2. Start another mutation in the same scope.
3. Confirm the second command stops without writing.
4. Confirm read-only status reports the active or unfinished operation.

### 11.11 Terminated-process recovery

1. Initialize pack `0.1.0`.
2. Simulate termination after the update journal is marked `applying` and at least one file changes.
3. Run `status` and confirm it reports recovery required without writing.
4. Rerun the mutating command.
5. Confirm it restores version `0.1.0` before constructing a new plan.
6. Confirm the subsequent update can complete normally.

### 11.12 Path containment

1. Attempt to load a pack whose component path escapes through `..` or a symlink.
2. Attempt to write through a target path that resolves outside the selected scope.
3. Place a symlink at a final managed output path.
4. Confirm every case stops without writing outside the allowed root.

## 12. Manual agent smoke tests

Automated tests prove file behavior. They do not prove that current agent versions discover the files.

The first run is recorded in
[Agents Pack real-agent conformance — 2026-07-24 to 2026-07-25](./agents-pack-conformance-2026-07-25.md).
Claude Code, Codex, and Cursor passed repository v1-to-v2 checks. Claude Code
and Codex also passed global v1-to-v2 checks.

Create one clean temporary repository per agent.

### Claude Code

1. Initialize repository mode for Claude only.
2. Start a new Claude Code session.
3. Ask for the Agents Pack smoke-test instruction version.
4. Invoke the smoke-test skill.
5. Confirm both report version 1.
6. Update to pack `0.2.0`.
7. Start a fresh session and confirm both report version 2.

### Codex

Repeat the same process with Codex only. Confirm the root `AGENTS.md` block and `.agents/skills` package are discovered.

### Cursor

Repeat with Cursor only. Confirm `.cursor/rules/agents-pack/smoke.mdc` and the chosen Cursor skill location are discovered.

Record the exact tested product versions and any behavior differences. These tests become the beginning of the adapter conformance suite.

## 13. Definition of done

The lifecycle MVP is complete when:

1. all four commands work in repository scope;
2. all four commands work in global scope for Claude and Codex;
3. dry-run and real execution use the same planner;
4. the automated acceptance tests pass;
5. a failed update restores the previous state;
6. manual smoke tests succeed for each agent in an isolated repository;
7. no test writes to real user agent directories;
8. unsupported global Cursor behavior fails clearly;
9. concurrent mutations are rejected;
10. a terminated mutation is recoverable from its persistent journal;
11. canonical path checks prevent writes outside the selected root;
12. the code contains no network or registry dependency; and
13. the implementation notes identify what must change before a public release.

## 14. What comes immediately after

After this lifecycle works, the next increment should add only:

1. a real first-party pack in place of the stub content;
2. local creation and rendering of one user-owned skill;
3. drift-resolution choices: restore, fork, pin, or stop managing;
4. one stub subagent to exercise the next adapter type; and
5. a real remote pack resolver with integrity verification.

This keeps the first implementation focused on the part that is hardest to retrofit later: safe ownership and updates.
