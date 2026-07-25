# Cursor: configuration, skills, plugins, and memory portability

**Research snapshot:** 2026-07-18  
**Scope:** Cursor editor/Agent, Cursor CLI, and (where relevant) Cloud Agents and Automations  
**Sources:** Cursor's current official documentation, changelog, blog, and Cursor-owned GitHub repositories only

## Executive summary

Cursor is more portable than its `.cursor/*` branding suggests:

- **High portability:** `AGENTS.md`; Agent Skills packaged as `SKILL.md`; MCP server definitions at a conceptual level; Markdown subagent definitions. Cursor explicitly discovers compatibility paths named for Cursor, Claude, and Codex, but current Codex's native paths/formats do not always match the `.codex/*` compatibility names.
- **Partial portability:** `CLAUDE.md` is automatically read by **Cursor CLI at the project root**, but current editor rules documentation does not promise the same behavior. Claude Code hooks can run through an opt-in compatibility layer, with event/tool limitations.
- **Cursor-specific:** `.cursor/rules/*.mdc`, `.cursor-plugin/plugin.json`, Cursor team/user rules stored through the UI, and Cursor's built-in memory systems.
- **Poor portability:** interactive Agent memories and Automation memories. Cursor documents no filesystem path, serialization schema, or export/import path for interactive memories; Automation memories explicitly live outside the agent worktree.
- **Important surface boundary:** editor Agent, CLI, Cloud Agents, and Automations do not all consume exactly the same configuration. A portability layer should identify the runtime instead of treating “Cursor” as one lookup contract.

The safest cross-agent source of truth today is a repository-owned `AGENTS.md` plus open-format `SKILL.md` packages. Cursor-specific rules and plugin metadata can be generated from that canonical representation.

## Status labels used below

- **Current documented:** explicitly present in Cursor's current documentation on the snapshot date.
- **Legacy/historical:** present in older official documentation or changelog material but omitted from the current documentation.
- **Documentation gap:** Cursor does not currently publish enough detail to rely on the behavior as a stable interface.

## 1. Automatically discovered instructions and Markdown files

### Lookup matrix

| Artifact | Location | Surface | Automatic behavior | Status |
|---|---|---|---|---|
| Project Rules | `<project>/.cursor/rules/**/*.mdc` | Editor Agent; shared by CLI | Discovered as project rules. Nested folders inside the rules directory may be used for organization. Plain `.md` files in this directory are ignored as project rules. | Current documented |
| `AGENTS.md` | Project root and subdirectories | Editor Agent; CLI rules system | Applied automatically. A nested file applies when working in its directory or descendants; it combines with parent files and the more specific file wins conflicts. | Current documented |
| `CLAUDE.md` | `<project>/CLAUDE.md` | Cursor CLI | Root file is read and applied alongside `.cursor/rules` and root `AGENTS.md`. Current editor rules docs do not document automatic `CLAUDE.md` loading. | Current documented, CLI-specific |
| User Rules | Cursor Settings → Rules | Editor Agent | Always applied to Agent Chat across the user's projects. Cursor does not document a user-rule filesystem representation. | Current documented |
| Team Rules | Cursor dashboard | Editor Agent for team members | Free-form rules, optionally scoped by globs. Can be enforced or user-disableable. | Current documented |
| Imported remote rules | `.cursor/rules/imported/<repository-name>/...` | Project | Cursor scans `.mdc` files in an imported GitHub repository and preserves their relative layout under an imported directory. | Current documented |
| `.cursorrules` | Project root | Older Cursor versions | Older official docs described this as supported but deprecated in favor of Project Rules. It is absent from the current rules page and should not be a new portability target. | Legacy/historical |
| Arbitrary names such as `DESIGN.md` | Anywhere | — | No current official Cursor documentation assigns automatic semantics to arbitrary Markdown filenames. Such files may still be read when explicitly referenced or found during normal repository exploration. | Documentation gap / no special discovery documented |

Sources: [Rules](https://cursor.com/docs/rules), [Cursor CLI usage](https://cursor.com/docs/cli/using).

### Project Rule format

Project Rules are `.mdc` files: Markdown with YAML frontmatter. Cursor documents these selector fields:

```md
---
description: Conventions for React components
globs:
  - "src/components/**/*.tsx"
alwaysApply: false
---

- Prefer composition over boolean prop proliferation.
- Add tests for externally visible behavior.
```

Selection behavior:

| Frontmatter | How Cursor uses the rule |
|---|---|
| `alwaysApply: true` | Always included; `description` and `globs` do not control selection. |
| `alwaysApply: false` plus `globs` | Automatically attached when a matching file is in context. |
| `alwaysApply: false` plus `description`, no globs | Agent decides whether the description is relevant. |
| No automatic selector | Available for manual inclusion with `@`. |

Cursor says rules are injected near the beginning of model context. Current docs explicitly give the cross-category conflict order **Team Rules → Project Rules → User Rules**, with earlier categories winning when instructions conflict. Nested `AGENTS.md` files have their own specificity rule: children override parents. Cursor does **not** document the exact tie-break between an `AGENTS.md` instruction and a `.cursor/rules/*.mdc` instruction at the same scope.

The current page clearly supports organizational subfolders *inside* the project `.cursor/rules` root. Older official documentation also described multiple directory-local `.cursor/rules` roots throughout a repository, but that guarantee is no longer stated on the current page. A migration tool should not depend on that older behavior without a version-specific runtime test.

Source: [Rules](https://cursor.com/docs/rules).

### Portability assessment for instruction files

- `AGENTS.md` is the strongest direct interchange format because it is plain Markdown, hierarchical, repository-owned, and current Cursor understands it without conversion.
- `.mdc` content is easy to transform, but its selector metadata (`globs`, `alwaysApply`, agent-selected descriptions) requires mapping to each target agent's rule model.
- Root `CLAUDE.md` is a useful CLI compatibility input, not a safe cross-surface Cursor default.
- UI-managed User and Team Rules need an explicit export/synchronization mechanism; copying a repository alone will not carry them.
- A canonical `DESIGN.md` can be shared as documentation, but another automatically loaded file should point to it unless the agent is known to discover it.

## 2. Agent Skills

Cursor describes Agent Skills as an **open standard** and uses progressive disclosure: it discovers skill metadata at startup, exposes the available skills to the agent, and lets the agent load the full instructions and supporting resources when relevant. A user can invoke a skill explicitly as `/skill-name`. [Skills](https://cursor.com/docs/skills)

### Discovery locations

| Scope | Native Cursor roots | Compatibility roots Cursor also reads |
|---|---|---|
| Project | `.agents/skills/`, `.cursor/skills/` | `.claude/skills/`, `.codex/skills/` |
| User | `~/.agents/skills/`, `~/.cursor/skills/` | `~/.claude/skills/`, `~/.codex/skills/` |

Cursor recursively searches these roots for directories containing `SKILL.md`. It also discovers project `.agents/skills` and `.cursor/skills` directories nested below the repository root. A skill found at the repository root is available across the project; a nested skill is automatically scoped to its containing subtree. Category directories are organizational only—the skill is identified by the directory that directly contains `SKILL.md`.

Source: [Skills](https://cursor.com/docs/skills).

### Package structure

```text
my-skill/
├── SKILL.md              # required
├── scripts/              # optional executable helpers
├── references/           # optional supporting documentation
└── assets/               # optional templates or other resources
```

`SKILL.md` contains YAML frontmatter followed by Markdown instructions:

```md
---
name: review-api-change
description: Review an API change for compatibility and migration risks
paths:
  - "src/api/**"
  - "openapi/**"
disable-model-invocation: false
metadata:
  owner: platform
---

# Review an API change

Follow the checklist in `references/checklist.md`.
Run `scripts/check-contract.sh` before finalizing the review.
```

| Field | Requirement and behavior |
|---|---|
| `name` | Required; lower-case letters, numbers, and hyphens; must match the parent directory name. |
| `description` | Required; used as the agent's relevance signal. |
| `paths` | Optional glob string/list; the skill is surfaced only when Cursor reads or edits matching files. |
| `disable-model-invocation` | Optional boolean; when true, only explicit slash invocation activates the skill. |
| `metadata` | Optional arbitrary mapping. |
| `globs` | Accepted as a legacy fallback; new skills should use `paths`. |

The main file is the discovery and instruction entrypoint. The agent reads referenced files or assets on demand and can execute scripts referenced relative to the skill root. Cursor's current docs do not specify collision resolution when two discovery roots contain skills with the same name. A portable package should therefore use globally distinctive skill names and avoid relying on root priority.

Source: [Skills](https://cursor.com/docs/skills).

### Migration and portability

Cursor's `/migrate-to-skills` command converts “Apply Intelligently” rules and workspace/user slash commands into skills. Converted commands are marked `disable-model-invocation: true`. Always-applied rules, glob-scoped rules, and User Rules are not migrated because their application semantics differ.

Practical consequences:

- A standards-shaped `SKILL.md` directory is directly movable among Cursor-compatible roots. Cursor's explicit `.claude/skills` and `.codex/skills` discovery is unusually useful for a shared configuration repository.
- Keep executable helpers free of Cursor-only environment assumptions if the goal is cross-agent use.
- Treat `paths` and model-controlled invocation as capabilities that may need degradation on an agent supporting only name/description discovery.
- Cursor's UI groups installed/project skills under Customize, but the files remain the portable unit.

Source: [Skills](https://cursor.com/docs/skills).

## 3. Plugins

Cursor introduced its plugin system in Cursor 2.5 (February 2026). A plugin is a distribution envelope that can bundle rules, skills, subagents, commands, MCP servers, hooks, and canvases. Plugins may be installed for a project or at user scope; installed components can be individually viewed and toggled in Customize. [Plugins](https://cursor.com/docs/plugins), [Cursor 2.5 changelog](https://cursor.com/changelog/2-5), [Customize](https://cursor.com/docs/customize-cursor)

### Canonical plugin layout

```text
my-plugin/
├── .cursor-plugin/
│   └── plugin.json       # plugin manifest
├── rules/                # .mdc rules (default convention)
├── skills/
│   └── my-skill/
│       └── SKILL.md
├── agents/               # Markdown subagents
├── commands/             # reusable command prompts
├── hooks/
│   └── hooks.json
├── mcp.json
├── scripts/
├── assets/
└── README.md
```

Only `name` is required in `.cursor-plugin/plugin.json`:

```json
{
  "name": "portable-review-tools",
  "description": "Shared review rules and workflows",
  "version": "1.0.0",
  "author": { "name": "Example Team" },
  "license": "MIT",
  "keywords": ["review", "portability"]
}
```

Names use lower-case alphanumerics, hyphens, and periods and must begin and end with an alphanumeric character. Optional metadata includes `description`, `version`, `author`, `homepage`, `repository`, `license`, `keywords`, and `logo`. Optional component declarations are `rules`, `agents`, `skills`, `commands`, `hooks`, and `mcpServers`.

Source: [Plugin reference](https://cursor.com/docs/reference/plugins).

### Default component discovery

When a component field is absent from the manifest, Cursor follows these defaults:

| Component | Default discovery |
|---|---|
| Skills | Each immediate/default skill directory under `skills/` that contains `SKILL.md` |
| Rules | `.md`, `.mdc`, and `.markdown` under `rules/` |
| Agents | `.md`, `.mdc`, and `.markdown` under `agents/` |
| Commands | `.md`, `.mdc`, `.markdown`, and `.txt` under `commands/` |
| Hooks | `hooks/hooks.json` |
| MCP | `mcp.json` |
| Single-skill shorthand | Root `SKILL.md`, only when there is no `skills/` directory and the manifest has no `skills` declaration |

This differs from project rules: a plugin may discover Markdown files in its `rules/` directory, while a repository's `.cursor/rules` requires `.mdc` for the Project Rule mechanism. If a manifest explicitly declares paths for a component, that declaration replaces—not augments—the default discovery for that component. Paths must be relative to the plugin root; absolute paths and `..` traversal are rejected.

Source: [Plugin reference](https://cursor.com/docs/reference/plugins).

### Installation, development, and marketplaces

- Public Marketplace plugins are distributed from Git repositories and submitted for Cursor review through Cursor's publishing flow.
- Local plugin development uses `~/.cursor/plugins/local/<plugin-name>`; the plugin manifest remains at the plugin root under `.cursor-plugin/plugin.json`, and Cursor must be reloaded/restarted to see changes.
- A repository containing multiple plugins uses a root `.cursor-plugin/marketplace.json`. It declares marketplace metadata and a `plugins` list (up to 500 entries), each pointing to a plugin source. If a plugin also has its own `plugin.json`, its manifest values take precedence over overlapping marketplace-entry values.
- Team Marketplaces are available for Teams and Enterprise. Administrators import a marketplace repository and can distribute plugins as Default Off, Default On, or Required.
- A `workspaceOpen` hook can return absolute `pluginPaths`, enabling a tool to add workspace-dependent plugins dynamically.

Sources: [Plugins](https://cursor.com/docs/plugins), [Plugin reference](https://cursor.com/docs/reference/plugins), [Hooks](https://cursor.com/docs/hooks), [Customize changelog](https://cursor.com/changelog/customize), [official plugin template](https://github.com/cursor/plugin-template), [official plugin repository](https://github.com/cursor/plugins).

### Plugin portability limits

The **contents** of a Cursor plugin may be portable while the **plugin package** is not:

- `skills/*/SKILL.md` can often move directly.
- `rules/*.mdc` need rule-metadata conversion.
- `mcp.json` is structurally reusable when another agent supports the same transport and interpolation assumptions.
- Hook scripts may be reusable, but event names, JSON payloads, blocking semantics, and available environment variables need adapters.
- `.cursor-plugin/plugin.json` and `.cursor-plugin/marketplace.json` are Cursor-specific distribution manifests.

Current docs do not define a plugin-qualified namespace for component names or a deterministic collision policy when multiple installed plugins expose the same skill, rule, command, or agent name. Use distinctive component names and treat collision behavior as a runtime test, not a stable API.

## 4. Memory

Cursor currently has two distinct features that have been called memory. They should not be conflated.

### Memory mechanism matrix

| Mechanism | Scope | Creation/use | Storage and format | Controls | Portability |
|---|---|---|---|---|---|
| Interactive Agent Memories | Historically documented as per-project, per-user, across chats | Older official docs describe a background/sidecar process extracting useful facts, with approval for background-generated entries; the agent could also create a memory when asked or when it identified an important fact. | Cursor has not documented a filesystem path, serialized schema, repository file, or export/import API. | Older docs placed management in Settings → Rules. Cursor's July 2025 changelog called Memories generally available. | Low: no documented portable artifact. |
| Automation Memories | Per individual automation across its runs | The automation has a memory tool and can maintain named persistent notes. | Each entry is a named memory file (`MEMORIES.md` by default), but Cursor explicitly says it exists **outside the agent's working filesystem**. | Enabled by default; users can disable it, inspect/edit entries in automation settings, and delete outdated entries. | Low: Markdown-like content, but not a repository file and no export contract is documented. |

Sources: [Memories GA changelog](https://cursor.com/changelog/1-2), [historical official Memories URL, now redirected](https://docs.cursor.com/en/context/memories), [Automation memories](https://cursor.com/docs/cloud-agent/automations#memories).

### Current documentation gap for interactive memory

Cursor's former dedicated Memories documentation URL now redirects to the general Rules page, and the current Rules page does not describe interactive Agent Memories. The official changelog remains evidence that the feature reached GA, but it is not a current storage/API contract. Therefore, as of this snapshot, the following should be considered **undocumented**:

- physical storage location (local database, service-side store, or otherwise);
- serialization format and schema;
- exact project identity/keying behavior;
- retention and synchronization across machines;
- programmatic list/export/import APIs;
- merge precedence between a memory and Team, Project, User, or `AGENTS.md` rules.

This is a documentation gap, not proof that interactive memory has been removed. A portability product should treat Cursor memories as opaque unless it obtains a supported API or explicit user export.

### Related state that is not long-term memory

Cursor CLI can resume prior conversations using `agent resume`, `--continue`, `/resume`, and `agent ls`. That restores conversation context, but it is not a documented cross-project memory store or portable memory format. Similarly, plans saved under `.cursor/plans/` are repository/workspace artifacts that future agents can reference; current docs do not say they are automatically injected as durable user memory.

Sources: [Cursor CLI usage](https://cursor.com/docs/cli/using), [Agent best practices](https://cursor.com/blog/agent-best-practices).

## 5. Adjacent portability surfaces

### MCP

Cursor reads MCP configuration from:

- project: `.cursor/mcp.json`;
- user/global: `~/.cursor/mcp.json`.

The JSON has a top-level `mcpServers` object. Cursor supports local `stdio` servers and remote HTTP/SSE-style connections, OAuth, environment variables, optional environment files, and interpolation including `${env:NAME}`, `${userHome}`, `${workspaceFolder}`, `${workspaceFolderBasename}`, and platform path separators. Cursor CLI detects the same `mcp.json` configuration as the editor.

Cloud Agents are a separate boundary: team/dashboard configuration is used for cloud MCP, and supported cloud transports/credential handling are not identical to a local editor session. A portability system should normalize server intent, transport, executable path, secrets, and scope separately rather than copying `.cursor/mcp.json` blindly.

Sources: [MCP](https://cursor.com/docs/mcp), [Cursor CLI usage](https://cursor.com/docs/cli/using), [Cloud Agent capabilities](https://cursor.com/docs/cloud-agent/capabilities).

### Hooks and Claude Code compatibility

Native Cursor hooks live at:

- project: `<project>/.cursor/hooks.json`;
- user: `~/.cursor/hooks.json`.

The current schema is versioned (`"version": 1`) and maps lifecycle events to command or prompt-based handlers. Command hooks exchange JSON over stdin/stdout; exit code `2` blocks an action, while ordinary hook failures generally fail open. Events cover sessions, tool/MCP/shell execution, file access and edits, subagents, prompt submission, compaction, stop, and workspace opening.

Cursor also has an opt-in third-party compatibility switch (“Include third-party Plugins, Skills, and other configs”). When enabled, it loads Claude Code hooks in this order:

1. `.claude/settings.local.json`
2. `.claude/settings.json`
3. `~/.claude/settings.json`

Across native and compatible sources, documented precedence is Enterprise → Team → project Cursor hooks → user Cursor hooks → Claude project-local → Claude project → Claude user. All matching hooks run; higher-precedence definitions win merge conflicts. Compatibility is partial: Claude's `Notification` and `PermissionRequest` events and the `Glob`, `WebFetch`, and `WebSearch` tool mappings are not supported.

Cloud Agents differ again: repository `.cursor/hooks.json` and team/enterprise hooks are supported, user hooks are unavailable, prompt-based hooks are not supported, and the event set is smaller.

Sources: [Hooks](https://cursor.com/docs/hooks), [third-party hooks](https://cursor.com/docs/reference/third-party-hooks).

### Subagents

Cursor discovers subagent Markdown files from project `.cursor/agents/` and user `~/.cursor/agents/`, and also reads `.claude/agents/`, `.codex/agents/`, and their user-level equivalents. Project definitions win same-name user definitions, and native `.cursor` definitions win `.claude`/`.codex` definitions. Frontmatter may set `name`, `description`, `model`, `readonly`, and `is_background`; the body contains the agent instructions.

This makes the Markdown body highly portable, but model identifiers, read-only/background semantics, tool permissions, and handoff/resume behavior need capability mapping. In particular, current Codex documents agent roles in layered TOML/config rather than `.codex/agents/*.md`; Cursor's `.codex/agents` discovery path should not be read as direct support for current native Codex agent-role artifacts.

Source: [Subagents](https://cursor.com/docs/subagents).

### Commands and plans

Cursor still presents commands as reusable Markdown prompts invoked with `/`, and plugins may bundle them. The current skill migration path makes skills the more expressive target for new portable workflows. Older official command docs described workspace commands in `.cursor/commands/*.md` and labeled the feature beta; current top-level documentation is less explicit about standalone command lookup and user-level paths. Treat exact command discovery outside plugins as version-sensitive.

Plans saved to `.cursor/plans/` can serve as shareable project artifacts, but they are not automatically equivalent to rules, skills, or memory.

Sources: [Customize](https://cursor.com/docs/customize-cursor), [Skills migration](https://cursor.com/docs/skills), [Agent best practices](https://cursor.com/blog/agent-best-practices).

## 6. What can move easily—and what needs translation

| Cursor artifact/capability | Portability | Recommended treatment |
|---|---|---|
| `AGENTS.md` | **High / direct** | Use as canonical repository instructions. Preserve hierarchy. Test target-agent conflict rules. |
| `.agents/skills/<name>/SKILL.md` | **High / direct** | Prefer the neutral `.agents/skills` root; keep names unique and scripts runtime-neutral. |
| `.claude/skills` or `.codex/skills` | **High into Cursor** | Cursor reads both directly. Reverse portability depends on the other agent's discovery contract. |
| `.cursor/rules/*.mdc` | **Medium / transform** | Preserve Markdown body; translate YAML selectors and precedence. |
| Root `CLAUDE.md` | **Medium / surface-limited** | Direct for Cursor CLI; generate or reference it from `AGENTS.md` for consistent editor behavior. |
| Cursor plugin | **Low as package; mixed inside** | Unpack into neutral skills/rules/MCP/hooks; regenerate each agent's manifest/distribution wrapper. |
| `.cursor/mcp.json` | **Medium / normalize** | Reuse server definitions but adapt scope, transport, interpolation, auth, and cloud/local execution. |
| `.cursor/hooks.json` | **Medium-low / adapter** | Reuse hook scripts; translate event and payload schemas. Use Cursor's Claude compatibility only after testing unsupported events/tools. |
| `.cursor/agents/*.md` | **Medium-high** | Reuse instructions; map model, permission, background, and resume semantics. |
| `.cursor/commands/*.md` | **Medium** | Convert durable commands into skills; keep simple prompts as plain Markdown commands where supported. |
| User/Team Rules | **Low without export** | Add an explicit export/import pipeline; do not assume repository checkout includes them. |
| Interactive Agent Memories | **Low / opaque** | No documented file/API. Treat as non-portable user state pending a supported export. |
| Automation Memories | **Low / opaque storage** | Content is note-like, but entries live outside the worktree; require a supported retrieval path or user-mediated export. |
| `.cursor/plans/*.md` | **Medium as documents** | Portable as ordinary Markdown, but not as automatically active instructions. |

## 7. Design implications for an agent-neutral system

1. **Separate content from activation semantics.** Store the instruction text once, then model “always,” path-matched, model-selected, and manually invoked activation independently.
2. **Represent scope explicitly.** Repository, directory subtree, user, team, runtime, and automation scopes are not interchangeable.
3. **Generate adapters, not copies.** Render `AGENTS.md`, `.mdc`, plugin manifests, hook schemas, and MCP configs from a neutral intermediate model.
4. **Use capability negotiation.** An agent may understand the same file but ignore `paths`, background execution, prompt hooks, or plugin distribution metadata.
5. **Keep secrets out of portable artifacts.** Store secret references in the neutral model and bind them through each runtime's supported secret mechanism.
6. **Treat memory as a service boundary.** Rules and skills are files; Cursor memories currently are not a documented file interface. A cross-agent memory layer should own its own schema, consent, provenance, retention, and injection policy.
7. **Record provenance and conflict resolution.** Cursor has several overlapping sources, and some precedence relationships are documented while others are not. A generated bundle should be able to explain which canonical item produced each agent-specific artifact.

## 8. Open questions worth validating against a test fixture

These are current documentation gaps or version-sensitive behaviors:

- exact precedence between same-scope `AGENTS.md`, `.cursor/rules/*.mdc`, and imported rules;
- whether directory-local `.cursor/rules` roots outside the repository's primary `.cursor/rules` are still discovered in current builds;
- collision resolution for same-name skills/components across native roots, compatibility roots, and plugins;
- the on-disk/cache location and stable identifier scheme for Marketplace-installed plugins;
- current interactive Agent-memory storage, synchronization, export, and conflict semantics;
- which local user/project customizations are copied into each Cloud Agent environment;
- current standalone command lookup behavior outside plugin packages.

A small conformance repository can test these without depending on undocumented storage: give each candidate source a unique marker, run editor Agent/CLI/Cloud Agent tasks in controlled directories, and record which markers enter context and which one wins a deliberate conflict.

## Source inventory

All sources were accessed on **2026-07-18**.

| Official source | What it supports | Status note |
|---|---|---|
| [Rules](https://cursor.com/docs/rules) | Rule types, `.mdc` format, `AGENTS.md` hierarchy, user/team/imported rules, precedence | Current |
| [Cursor CLI usage](https://cursor.com/docs/cli/using) | CLI loading of `.cursor/rules`, root `AGENTS.md`, root `CLAUDE.md`, MCP detection, resume/worktrees | Current |
| [Skills](https://cursor.com/docs/skills) | Discovery roots, compatibility roots, `SKILL.md` schema, scope, progressive loading, migration | Current |
| [Customize Cursor](https://cursor.com/docs/customize-cursor) | User/team/workspace customization surfaces | Current |
| [Plugins](https://cursor.com/docs/plugins) | Plugin contents, installation, marketplace/team distribution, local development | Current |
| [Plugin reference](https://cursor.com/docs/reference/plugins) | Manifest fields, default discovery, path constraints, multi-plugin marketplace schema | Current |
| [Cursor plugin template](https://github.com/cursor/plugin-template) | Cursor-owned starter layouts and examples | Current repository |
| [Cursor official plugins](https://github.com/cursor/plugins) | Cursor-owned Marketplace/plugin examples | Current repository |
| [Cursor 2.5 changelog](https://cursor.com/changelog/2-5) | Plugin release timing and launch scope | Current historical release record |
| [Customize changelog](https://cursor.com/changelog/customize) | Customize scopes, team marketplaces, canvases | Current historical release record |
| [MCP](https://cursor.com/docs/mcp) | Project/user configuration, transports, OAuth, interpolation | Current |
| [Hooks](https://cursor.com/docs/hooks) | Native hook paths, events, execution contract, cloud differences, dynamic plugin paths | Current |
| [Third-party hooks](https://cursor.com/docs/reference/third-party-hooks) | Claude hook compatibility, opt-in, precedence, unsupported mappings | Current |
| [Subagents](https://cursor.com/docs/subagents) | Native and compatibility discovery paths, frontmatter, conflict priority | Current |
| [Automation memories](https://cursor.com/docs/cloud-agent/automations#memories) | Automation memory scope, default entry name, external-to-worktree storage, controls | Current |
| [Cloud Agent capabilities](https://cursor.com/docs/cloud-agent/capabilities) | VM and cloud MCP/runtime boundary | Current |
| [Memories GA changelog](https://cursor.com/changelog/1-2) | Interactive Memories GA milestone and approval UX | Historical release record; not a storage contract |
| [Former Memories page](https://docs.cursor.com/en/context/memories) | Historical memory behavior | Official URL now redirects; use only as historical evidence |
| [Agent best practices](https://cursor.com/blog/agent-best-practices) | Workspace plans and operational guidance | Current official blog |
