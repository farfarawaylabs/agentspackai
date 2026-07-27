# Agents Pack component selection and state design

**Status:** Implemented and repository-conformant  
**Last updated:** 2026-07-27  
**Scope:** First public pack, configuration, and lockfile formats; interactive
component selection; official component installation and removal

## 1. Goal

Let a user choose which official Agents Pack components are installed:

- during `agents-pack init`, through Recommended, All, or Custom selection; and
- after initialization, with `agents-pack install` and
  `agents-pack remove`.

Agents Pack must remember the exact selection, render only those components,
preserve the selection during updates, and continue to protect all managed
outputs with the existing planner and transactional executor.

Nothing has shipped yet. This design replaces the prototype schemas directly.
There is no migration or backward-compatibility work.

## 2. Decisions

1. The first public pack, configuration, lockfile, and Base formats all use
   schema version `1`. TOML uses `schema_version`; JSON uses `schemaVersion`.
2. A component has one stable public ID such as `ap-debug`. The ID shown in the
   menu is the ID accepted by the CLI and stored in state.
3. The pack manifest is the official component catalog. It describes titles,
   summaries, categories, targets, and default selection behavior.
4. The core instruction component is required. Skills and subagents are either
   recommended or optional.
5. Recommended and All are shortcuts that expand to explicit component IDs at
   initialization time. They are not ongoing subscriptions.
6. Updates preserve the explicit selection. A newly recommended component is
   never installed silently.
7. The human-readable configuration records user intent. The lockfile records
   the exact resolved result.
8. Agents Pack caches immutable packs by digest in a shared user-level cache.
   The lockfile's pack digest identifies the installation's Base. This lets
   `install` and `remove` work without another pack path and later enables
   restore and fork.
9. Install, remove, and update reconcile the complete desired output tree
   through the existing planner. They do not edit provider files directly.
10. Official component installation and user-owned component creation remain
    different commands.

## 3. Non-goals

This increment does not add:

- remote pack downloads, channels, or signature verification;
- user-owned skills or subagents;
- drift-resolution choices such as restore, fork, or pin;
- component dependencies, conflicts, bundles, or profiles;
- scripts, hooks, plugins, or MCP installation;
- hybrid global and repository scope;
- global Cursor instructions;
- a desktop interface; or
- session-log analysis.

The schema should not contain speculative fields for these features. The Base
cache is included because the component commands need the installed pack
immediately and future drift handling has the same requirement.

## 4. Terminology

| Term | Meaning |
| --- | --- |
| Pack | One immutable published collection of official components |
| Component | One instruction, skill, or subagent in the pack |
| Required | Always selected for a compatible installation |
| Recommended | Selected by the Recommended shortcut |
| Optional | Selected only through All, Custom, or `install` |
| Selection | The explicit component IDs configured for one scope |
| Base | The exact validated pack used by the current installation |
| Output | One rendered provider file or managed instruction block |

## 5. Pack manifest

The pack manifest becomes both the render manifest and the component catalog.

```toml
schema_version = 1
id = "agents-pack-core"
version = "0.24.0"
title = "Agents Pack Core"

[[components]]
id = "ap-core-instructions"
kind = "instruction"
title = "Core development instructions"
summary = "Project orientation, independent judgment, investigation, quality, and completion guidance."
category = "core"
selection = "required"
source = "instructions/core.md"
targets = ["claude", "codex", "cursor"]

[[components]]
id = "ap-debug"
kind = "skill"
title = "Debug systematically"
summary = "Trace reproducible failures to evidence-backed root causes and verify fixes."
category = "engineering/workflows"
selection = "recommended"
source = "skills/engineering/workflows/debugging/ap-debug"
targets = ["claude", "codex", "cursor"]

[[components]]
id = "ap-audit-geo"
kind = "skill"
title = "Audit GEO and AEO"
summary = "Audit AI-search eligibility, usefulness, citations, and measurement."
category = "marketing/search"
selection = "optional"
source = "skills/marketing/search/ap-audit-geo"
targets = ["claude", "codex", "cursor"]
```

### 5.1 Pack fields

| Field | Rule |
| --- | --- |
| `schema_version` | Exactly `1` |
| `id` | Stable lowercase pack identifier |
| `version` | Immutable semantic version |
| `title` | Human-readable pack title |

Pack versions remain immutable. Reusing a version with different bytes is an
invalid pack.

### 5.2 Component fields

| Field | Rule |
| --- | --- |
| `id` | Unique lowercase slug; this is the public CLI name |
| `kind` | `instruction`, `skill`, or `subagent` |
| `title` | Concise menu label |
| `summary` | Plain-language description, concise enough for a terminal menu |
| `category` | Lowercase slash-separated category |
| `selection` | `required`, `recommended`, or `optional` |
| `source` | Safe path inside the pack |
| `targets` | Non-empty unique list of supported providers |

Official Agents Pack component IDs use the `ap-` prefix. The general parser
accepts any safe lowercase slug so the format is not unnecessarily tied to one
publisher.

Skill component IDs must match the skill frontmatter `name`. Subagent component
IDs must match `agent.toml` `name`. This prevents the catalog, CLI, and
provider-visible name from drifting apart.

Manifest component order is not a UI contract. Menus group by `category` and
then sort by `title`.

### 5.3 No dependencies in version one

References from one skill to another are recommendations, not installation
dependencies. The first format does not add `requires`, `conflicts`, or
dependency resolution.

If a future component truly cannot function without another component, that
need should justify a later schema change rather than a speculative dependency
system now.

### 5.4 Initial selection policy

`required` is reserved for behavior that defines a valid Agents Pack
installation. `recommended` is for broadly useful, low-surprise capabilities
that apply across common coding work. Specialized technology, discipline, or
role components remain optional.

The proposed first core defaults are:

Required:

- `ap-core-instructions`

Recommended:

- `ap-debug`
- `ap-review-plan`
- `ap-start-dev-session`
- `ap-clear-dev-context`
- `ap-continue-dev-session`
- `ap-refresh-repo-docs`
- `ap-compress-todos`
- `ap-handle-errors-reliably`
- `ap-validate-trust-boundaries`
- `ap-code-reviewer`

All other current core skills and subagents are optional. This classification
is content policy, not a schema rule, and should be reviewed whenever the core
catalog changes.

## 6. Selection rules

Selection happens after scope, target agents, and pack are known.

### 6.1 Compatibility

A component is compatible when its `targets` overlap at least one selected
agent.

- The menu shows compatible components.
- A component that supports only some selected agents may still be selected.
  The preview states which agents will receive it.
- Selecting a component with no compatible target is an error.
- Existing scope restrictions still apply. For example, repository Cursor is
  supported while global Cursor remains unsupported by the current product.

### 6.2 Required

Every compatible `required` component is always included.

- Required components appear in the menu as selected and locked.
- Custom selection cannot deselect them.
- `agents-pack remove` refuses to remove them.
- If an update adds a new compatible required component, the update preview
  adds it explicitly. The user may approve the update or cancel it.

The first core pack has one required component:
`ap-core-instructions`.

### 6.3 Recommended

Recommended expands to:

```text
all compatible required components
+ all compatible recommended components
```

It is the default highlighted choice in an interactive menu, but the user still
confirms it.

### 6.4 All

All expands to every component compatible with at least one selected agent.

All means “everything in this pack version now.” It does not mean “automatically
install every component published in the future.”

### 6.5 Custom

Custom opens a categorized multi-select menu:

```text
Core
  [locked] Core development instructions

Engineering / Workflows
  [x] Debug systematically
  [x] Review a plan
  [ ] Start a development session

Marketing / Search
  [ ] Audit SEO
  [ ] Audit GEO and AEO
```

The menu should support selecting or clearing a category, show the selected
count, and provide the component summary without leaving the flow.

Custom starts with the Recommended set selected. The user may clear any
recommended component; required components remain locked.

Submitting Custom with no optional choices is valid. Required components still
produce a useful installation.

### 6.6 Explicit storage

Every shortcut expands before state is written:

```toml
components = [
  "ap-core-instructions",
  "ap-debug",
  "ap-review-plan",
]
```

The configuration does not store `selection_mode = "recommended"` or
`selection_mode = "all"`.

This guarantees that changing the publisher's recommended set cannot silently
change an existing installation.

## 7. Human-readable configuration

Repository scope:

```text
.agents-pack/pack.toml
```

Global scope:

```text
~/.agents-pack/config.toml
```

Format:

```toml
schema_version = 1
scope = "repository"
targets = ["claude", "codex", "cursor"]
components = [
  "ap-core-instructions",
  "ap-debug",
  "ap-code-reviewer",
]

[pack]
id = "agents-pack-core"
source = "local"
```

### 7.1 Configuration responsibilities

The configuration records durable user intent:

- scope;
- selected providers;
- selected component IDs;
- pack identity; and
- how future pack versions should be resolved.

It does not record the installed pack version. Version and hashes belong in the
lockfile.

The first implementation accepts `source = "local"`. Remote distribution can
later add an official source and channel without storing machine-specific
absolute paths:

```toml
[pack]
id = "agents-pack-core"
source = "official"
channel = "stable"
```

Do not store a local absolute pack path. It would make repository configuration
machine-specific and leak developer paths into committed state.

### 7.2 Determinism

- Targets use canonical provider order.
- Components use canonical pack-manifest order.
- Configuration contains no timestamps or absolute paths.
- Repository configuration is safe to commit.

## 8. Lockfile

The generated lockfile records the exact realized installation:

```json
{
  "schemaVersion": 1,
  "rendererVersion": 1,
  "pack": {
    "id": "agents-pack-core",
    "version": "0.24.0",
    "sha256": "sha256:...",
    "source": {
      "kind": "local"
    }
  },
  "components": [
    {
      "id": "ap-core-instructions",
      "kind": "instruction",
      "sha256": "sha256:..."
    },
    {
      "id": "ap-debug",
      "kind": "skill",
      "sha256": "sha256:..."
    }
  ],
  "outputs": [
    {
      "kind": "file",
      "componentId": "ap-debug",
      "adapter": "claude",
      "path": ".claude/skills/ap-debug/SKILL.md",
      "sha256": "sha256:..."
    },
    {
      "kind": "managed-block",
      "componentId": "ap-core-instructions",
      "adapter": "codex",
      "path": "AGENTS.md",
      "blockId": "ap-core-instructions",
      "sha256": "sha256:..."
    }
  ]
}
```

### 8.1 Lockfile responsibilities

The lockfile records:

- exact immutable pack version and digest;
- resolved source kind and channel when one applies;
- renderer format version;
- exact selected components and their source digests; and
- every rendered file or managed region and its installed digest.

The component digest covers its manifest metadata and all source paths and
bytes using deterministic path framing. When a component digest changes but
its rendered output hashes do not, an update preview can identify the change as
catalog-only.

The lockfile contains no timestamp. The same inputs must produce the same
lockfile on different machines.

### 8.2 Why configuration and lock both contain components

The duplication is intentional:

- configuration says what the user wants;
- the lock says what was actually resolved and installed.

`status` verifies that they agree.

## 9. Base cache

Every applied local or downloaded pack is stored in a shared, content-addressed
user cache:

```text
~/.agents-pack/cache/packs/<64-character-pack-hash>.pack
```

Repository and global installations reuse the same immutable entry when they
use the same pack. The lockfile's `pack.sha256` selects the exact Base for that
scope. The filename omits the `sha256:` label and uses only lowercase
hexadecimal characters, keeping it portable across supported filesystems.

A cache entry is a deterministic container:

```json
{
  "schemaVersion": 1,
  "pack": {
    "id": "agents-pack-core",
    "version": "0.24.0",
    "sha256": "sha256:..."
  },
  "files": [
    {
      "path": "pack.toml",
      "sha256": "sha256:...",
      "contentBase64": "..."
    }
  ]
}
```

It contains the complete pack, including unselected components. Therefore:

- `install` can find an unselected component without another `--pack`;
- `remove` can rerender the remaining selection from the same immutable Base;
- future restore can reproduce official bytes; and
- future fork can recover canonical component sources.

Cache files are local operational data and are never added to a repository.
Repository configuration and lock state remain commit-friendly.

Cache writes follow these rules:

- validate the complete pack before caching it;
- write the digest-named entry atomically;
- never replace an existing entry with different bytes;
- verify a cached entry before using it; and
- treat an unused cache entry left by a failed installation as harmless.

Because the entry is immutable and content-addressed, it may be cached after
approval but before the scope transaction. A cache failure stops the operation
before any repository or global managed output changes. If the later scope
transaction fails, rollback restores the installation while the harmless cache
entry remains.

Dry-run and cancelled operations never populate the cache.

If a committed repository is cloned on another machine, `status` can still
verify installed outputs from the lockfile. Commands that need Base must
re-resolve the exact pack digest or ask for a matching local pack. Remote
resolution will make this automatic later.

`eject` removes scope configuration and managed outputs but does not delete the
shared cache. A future cache-prune command may safely remove entries that are no
longer referenced.

## 10. CLI behavior

### 10.1 Interactive initialization

```text
agents-pack init
```

Flow:

1. Detect repository context and existing scope.
2. Choose repository or global scope.
3. Choose target agents.
4. Resolve and validate the pack.
5. Choose Recommended, All, or Custom.
6. Expand the choice into explicit component IDs.
7. Show the exact component and file plan.
8. Confirm, write transactionally, validate, and summarize.

The plan shows:

- required, recommended, and optional selections;
- which providers receive each component;
- files and managed blocks created;
- unsupported-provider warnings; and
- scope-state files written and the Base digest used.

### 10.2 Non-interactive initialization

```text
agents-pack init \
  --scope repository \
  --agents claude,codex,cursor \
  --pack ./content/packs/core \
  --components recommended \
  --yes
```

Accepted component values:

```text
--components recommended
--components all
--components ap-debug,ap-code-reviewer
```

Presets cannot be mixed with explicit IDs. Non-interactive initialization
requires `--components`; it never relies on a publisher-controlled default
silently.

An explicit list may omit required components. The CLI adds them and reports
that fact in the preview.

### 10.3 List

```text
agents-pack list
```

This read-only command loads the digest-matched Base from the shared cache and
reports:

- installed, available, required, recommended, or optional status;
- kind and category;
- supported and selected agents; and
- components unavailable to the selected agents.

Useful filters may be added without changing the state model:

```text
agents-pack list --installed
agents-pack list --available
agents-pack list --kind skill
```

### 10.4 Install

```text
agents-pack install ap-security-audit
agents-pack install ap-security-audit --dry-run
agents-pack install ap-security-audit --yes
```

Install:

1. Detects the installed scope.
2. Loads configuration, lockfile, and the digest-matched Base from cache.
3. Resolves the component by exact ID.
4. Verifies compatibility and current output cleanliness.
5. Adds the ID to the explicit selection.
6. Renders the complete new desired tree.
7. Plans only the resulting differences.
8. Writes outputs, configuration, and lockfile transactionally.

Installing an already selected component is a successful no-op.

`install` selects from the currently locked pack version. If the ID is not in
that Base, the CLI suggests updating the pack rather than silently resolving a
different version during component installation.

### 10.5 Remove

```text
agents-pack remove ap-security-audit
```

Remove follows the same complete reconciliation process.

- Removing an unselected component is a successful no-op.
- Removing a required component is an error.
- Removing a component deletes only outputs owned by that component and empty
  Agents Pack-created directories.
- Other selected components and user-owned files remain unchanged.

### 10.6 Update

Update keeps the explicit component selection.

- Newly recommended and optional components are not added.
- Newly required compatible components are added and shown in the preview.
- If a selected component no longer exists, update stops and names it. The
  first version does not silently drop or rename selected components.
- The proposed pack digest becomes the new Base reference only after the update
  succeeds.

## 11. Planner and renderer changes

Selection extends the current architecture rather than creating a parallel
path.

```text
Pack + targets + selected component IDs
                    │
                    ▼
             Validate selection
                    │
                    ▼
          Render complete desired tree
                    │
                    ▼
      Compare with locked installed outputs
                    │
                    ▼
             One ChangePlan
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
       Dry run       Transactional executor
```

### 11.1 Renderer

`renderPack` accepts selected component IDs and:

1. validates that every ID exists;
2. adds required compatible components;
3. rejects components with no selected target overlap;
4. renders only selected components; and
5. preserves existing output-collision checks.

### 11.2 Shared reconciliation

Update, install, and remove need the same core operation:

```text
reconcile current locked outputs with a newly rendered desired tree
```

Extract this operation once. Command services decide the new pack or selection;
the reconciler decides file and managed-block operations.

Adapters still return bytes and never write. The planner still returns a
complete plan and never writes. The transactional executor remains the only
managed-content writer.

### 11.3 Drift

The first component-selection increment keeps the current conservative rule:
any missing, modified, or malformed official output stops install, remove, or
update before writing.

That restriction can be relaxed only when explicit restore, fork, pin, and
stop-managing behavior exists.

## 12. Error behavior

| Situation | Result |
| --- | --- |
| Unknown component ID | Stop and show the exact unknown ID |
| Component supports none of the selected agents | Stop and explain compatibility |
| Required component omitted during init | Add it and show it in the plan |
| Required component removal | Refuse without writing |
| Already installed component | Successful no-op |
| Already absent optional component | Successful no-op |
| Selected component missing from proposed update | Refuse update |
| Existing official output drift | Refuse mutation before writing |
| Missing Base cache entry | Status warning; Base-dependent command explains how to restore it |
| Base digest differs from lock | Treat Base as invalid and do not use it |
| Output collision | Treat pack or selection as invalid |
| Failed or interrupted mutation | Restore through the existing journal |

## 13. Implementation sequence

### Phase 1: Finalize schemas and catalog

- Replace the prototype pack schema with the format in section 5.
- Change official component IDs to their public `ap-` names.
- Add catalog metadata to every core component.
- Select the first required, recommended, and optional sets.
- Replace the prototype config and lock types and parsers.
- Update fixture packs instead of preserving old schemas.

Exit gate:

- malformed catalog metadata is rejected;
- skill and subagent names must match component IDs; and
- the complete core pack loads under schema version 1.

### Phase 2: Selection-aware rendering and state

- Add explicit selected component IDs to rendering.
- Add selected component digests to the lock.
- Add renderer versioning.
- Add Base serialization, validation, shared-cache paths, and atomic cache
  writes.
- Update init, update, status, and eject around the new state.

Exit gate:

- Recommended, All, and explicit selections render deterministic trees;
- scope state is written only after output validation, while an immutable Base
  cache entry may be written before the scope transaction; and
- update preserves explicit selections.

### Phase 3: Initialization UX

- Add `--components` parsing.
- Add the interactive Recommended, All, and Custom flow.
- Add grouped component summaries and selection counts.
- Keep prompt logic outside the core planner.

Exit gate:

- interactive cancellation writes nothing;
- non-interactive use requires an explicit component choice; and
- preview and apply use the same selection and plan.

### Phase 4: List, install, and remove

- Add read-only `list`.
- Add idempotent `install` and `remove`.
- Extract shared desired-tree reconciliation from update.
- Add dry-run, confirmation, locking, recovery, and failure-injection tests.

Exit gate:

- install and remove change only the selected component set and resulting owned
  outputs;
- required components cannot be removed; and
- all failure paths preserve the prior installation byte-for-byte.

### Phase 5: Real-agent conformance

In disposable repositories:

1. initialize Recommended for each provider;
2. verify one required instruction, recommended skill, and recommended
   subagent;
3. install one optional skill and verify discovery;
4. remove it and verify its file disappears without affecting other content;
5. initialize All and verify the full output tree is clean; and
6. record provider versions and limitations.

## 14. Acceptance criteria

The increment is complete when:

- interactive init supports Recommended, All, and Custom;
- non-interactive init supports Recommended, All, and explicit IDs;
- required components are always present;
- configuration stores exact selected IDs;
- updates preserve exact selected IDs;
- new recommended components are never installed silently;
- `list`, `install`, and `remove` work from the installed Base;
- install and remove are idempotent;
- lockfiles record exact component and output hashes;
- repository state contains no absolute developer paths or timestamps;
- all mutations remain transactional and drift-safe;
- fixture and automated tests use only the final schema version 1; and
- current Claude Code, Codex, and Cursor sessions discover the expected
  selected components.

## 15. Decisions deferred deliberately

The following decisions belong to later increments:

- remote artifact URL and signature fields;
- official versus third-party publisher identity;
- user-owned component state and naming;
- component renames or replacement metadata;
- pack pinning and rollback history;
- restoring a missing Base automatically;
- executable-component permissions; and
- desktop presentation.

Deferring them keeps this increment focused without blocking their future
implementation.
