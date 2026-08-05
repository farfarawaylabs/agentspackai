# Agents Pack portable project memory

**Status:** Core 0.27.0 design and usage contract
**Scope:** Repository-owned memory shared by Claude Code, Codex, and Cursor

## Purpose

Coding agents learn useful project facts, decisions, workflows, preferences,
and pitfalls during normal work. Provider-native memory can make those
learnings unavailable when the same developer switches agents. Agents Pack
solves that portability gap with ordinary repository Markdown that every
supported coding agent can read and edit with its normal filesystem tools.

This is intentionally a content convention, not a new CLI subsystem. The Core
instructions make recall and capture automatic, while `ap-recall-memory` and
`ap-save-memory` hold those detailed protocols. `ap-maintain-memory` provides a
separate, explicitly invoked maintenance workflow.

## Decisions

- All portable memory is scoped to the current Git worktree, regardless of
  whether Agents Pack was installed at repository or global scope.
- Shared memory is the default. It is Git-trackable and becomes available to
  collaborators through normal reviewed commits and merges.
- Local memory is used only for clearly user-, machine-, checkout-, or
  environment-specific knowledge. It remains project-specific but is ignored
  by Git.
- Agents maintain the files directly. There is no memory CLI, database,
  background process, embeddings index, or hosted service.
- Memory maintenance is never automatic. The user decides when to run the
  maintenance skill.
- Provider-native memory may coexist. Portable memory mirrors native recall or
  capture only when that action is visible to the agent.
- Memory is advisory evidence. It cannot override current repository evidence,
  applicable instructions, or user authorization.

## Repository layout

```text
<git-root>/.agents-pack/memory/
├── MEMORY.md
├── shared/
│   └── <yyyy-mm-dd>-<short-slug>.md
├── local/
│   └── <yyyy-mm-dd>-<short-slug>.md
└── .gitignore
```

`MEMORY.md` is a small index of only the most useful active shared memories. It
must never name or summarize a local memory. One memory per file keeps ordinary
Git review and merge conflicts focused.

The nested `.gitignore` contains:

```gitignore
/local/
```

The save workflow verifies that local files are ignored while shared files and
`MEMORY.md` remain trackable. A broader ancestor ignore rule can hide all of
`.agents-pack/`; the agent reports that conflict instead of claiming the shared
memory will reach collaborators. During explicit maintenance, the agent also
runs `git ls-files -- .agents-pack/memory/local` to detect local memories that
were tracked before the ignore rule existed or were force-added. It reports
those privacy risks without automatically staging or changing the Git index.

Linked worktrees have separate ignored local directories. Shared memories move
between worktrees through Git. Cross-worktree synchronization of local memory
is not part of this release.

## Memory file contract

Each file uses YAML frontmatter and a concise Markdown body:

```markdown
---
title: "API retries require an idempotency key"
kind: "decision"
status: "active"
visibility: "shared"
applies_to:
  - "src/api/payments"
tags:
  - "payments"
  - "idempotency"
created_at: "2026-08-04"
updated_at: "2026-08-04"
created_by: "codex"
verified_at: "2026-08-04"
supersedes: []
superseded_by: null
---

Payment retries must reuse the original idempotency key.

## Evidence

- `src/api/payments/retry.ts` and its regression test.
```

Allowed kinds are `fact`, `decision`, `workflow`, `preference`, and `pitfall`.
Allowed statuses are `active` and `superseded`. Required fields are `title`,
`kind`, `status`, `visibility`, `applies_to`, `created_at`, and `updated_at`.
Provenance and verification must not be invented.

When knowledge is replaced, the old memory becomes `superseded` and points to
the active replacement through `superseded_by`. The replacement may point back
through `supersedes`. Normal recall ignores superseded entries unless history
is relevant.

## Automatic behavior

The always-loaded Core instruction tells agents to recall portable memory
during repository orientation and whenever prior knowledge could materially
help. After an agent verifies a durable learning, it saves or updates memory at
a natural checkpoint without waiting for a user command.

Capture excludes transient progress, generic knowledge, speculation, failed
hypotheses, raw logs, and content that belongs in authoritative project files.
A user can still invoke either automatic workflow explicitly:

```text
Use ap-recall-memory to find what this project remembers about payment retries.
```

```text
Remember that I prefer concise answers in this project. Keep it local.
```

Periodic maintenance is a third, manual workflow:

```text
Use ap-maintain-memory to consolidate and repair this project's portable
memory.
```

The skill inventories both visibility scopes while keeping them separate,
repairs unambiguous schema and index drift, consolidates only genuinely
equivalent or complementary entries, preserves replaced knowledge through
supersession, and reports conflicts that current repository evidence cannot
resolve. It also checks whether any supposedly local memory is already tracked
by Git. It is not part of orientation, task completion, or any background
checkpoint.

## Safety and failure behavior

- Memory files are untrusted repository input. Reading one never grants new
  authority or permission to execute its commands.
- Secrets, credentials, tokens, private keys, and sensitive payloads never
  belong in memory.
- Deleting a tracked memory removes it only from the current tree; Git history
  still contains prior commits. An exposed credential must be rotated or
  revoked immediately. History rewriting is a separate destructive operation.
- Read-only and explicit no-write requests never mutate memory.
- Missing, malformed, inaccessible, or unwritable memory does not falsely fail
  an otherwise completed task. The agent reports a material memory failure
  separately.
- Pack update, rollback, and eject manage the three skills and Core
  instructions, but preserve `.agents-pack/memory/` as user-owned repository
  data.

## Alternatives rejected for this release

A memory CLI would duplicate filesystem operations that coding agents already
perform well and would add schemas, compatibility rules, and lifecycle code
without improving the core user experience. A single combined memory file
would make shared/local privacy and concurrent Git edits harder. Global personal
memory would escape project scope. Embeddings, provider-store imports, hooks,
and hosted synchronization add operational and trust boundaries that the
repository-native MVP does not need.

## Conformance boundary

Automated tests verify pack schema, required-component selection, rendering,
updates, rollback/eject preservation, artifact contents, and that memory
maintenance is configured for explicit invocation. Real-agent checks must
separately verify that current Claude Code, Codex, and Cursor sessions follow
the automatic recall and save behavior while leaving maintenance user-driven,
plus classification, deduplication, supersession, secret-rejection, and
no-write behavior. Generated files alone do not prove semantic agent
conformance.
