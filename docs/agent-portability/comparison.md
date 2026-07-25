# Claude Code, Codex, and Cursor: portability comparison

**Research snapshot:** 2026-07-18  
**Purpose:** Validate whether developers are materially locked into one coding-agent harness by instructions, skills, plugins, and memory, and identify what can move between Claude Code, Codex, and Cursor today.  
**Detailed reports:** [Claude Code](./claude-code.md) · [Codex](./codex.md) · [Cursor](./cursor.md)

## Executive verdict

The problem is **real, but narrower and more advanced than the original premise suggests**.

The three products are converging around several portable substrates:

- plain Markdown repository instructions;
- `AGENTS.md` as a cross-agent project-guidance convention, directly in Codex and Cursor and through a tiny import shim in Claude Code;
- the open Agent Skills directory format centered on `SKILL.md`;
- MCP as the common protocol for tools and external context; and
- similar concepts for hooks, subagents, commands, and plugin bundles.

This means a developer no longer loses *everything* when changing agents. Repository-owned instructions and well-authored skills are increasingly movable.

However, the hard part remains unsolved:

- each product discovers and prioritizes instructions differently;
- skill extensions, trigger behavior, paths, tool permissions, and runtime variables differ;
- plugin manifests, marketplaces, namespaces, caches, and supported components are vendor-specific;
- hooks, subagents, configuration, permissions, and cloud/local behavior require translation;
- generated memory is incompatible or undocumented at the storage/API layer; and
- account state, credentials, approvals, conversation history, and UI-managed rules do not travel with a repository.

The most accurate validation statement is therefore:

> **Portable content is emerging; portable behavior and portable learned state are not.**

The opportunity is less about copying a home directory and more about preserving semantics, scope, provenance, activation rules, and memory across different harnesses.

## 1. At-a-glance comparison

| Area | Claude Code | Codex | Cursor | Cross-agent result |
|---|---|---|---|---|
| Primary project instructions | `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules/**/*.md` | `AGENTS.md`, `AGENTS.override.md`, configured fallback names | `AGENTS.md`, `.cursor/rules/**/*.mdc`; root `CLAUDE.md` in Cursor CLI | Markdown content is portable; lookup and precedence are not |
| Arbitrary `DESIGN.md`-style docs | Not automatic; import from `CLAUDE.md` with `@path` | Not automatic; reference from `AGENTS.md` or configure as a fallback filename | No special automatic role documented; reference from an active rule or `AGENTS.md` | Shared docs move easily, but need an active routing file |
| Skills | Open Agent Skills core under `.claude/skills` | Open Agent Skills core under `.agents/skills` | Open Agent Skills core; reads `.agents`, `.cursor`, `.claude`, and `.codex` skill roots | Strongest portability surface |
| Progressive skill loading | Metadata first, body on invocation; subagent preload is a special case | Name, description, path first; full `SKILL.md` on selection | Metadata first; full skill/resources when relevant | Same design pattern, different details |
| Plugin manifest | Optional `.claude-plugin/plugin.json`; `name` required if present | Required `.codex-plugin/plugin.json` | Required `.cursor-plugin/plugin.json`; only `name` required | Bundled assets may move; package does not |
| Plugin components | Skills, agents, commands, hooks, MCP, LSP, styles, themes, monitors, executables, limited settings | Skills, hooks, MCP, ChatGPT app/connectors, assets | Rules, skills, agents, commands, MCP, hooks, canvases | Similar concept, different component and lifecycle contracts |
| User-authored durable knowledge | Plain Markdown files | Plain Markdown files | `AGENTS.md`/`.mdc`; user/team rules also live in product UI | Repo-owned Markdown is portable; UI state is not |
| Generated memory | Local per-repo Markdown with documented `MEMORY.md` entrypoint and limits | Local generated state under `~/.codex/memories`; public schema unspecified | Interactive memory storage/API undocumented; automation memories outside worktree | Semantic export only; raw interchange is unsafe or impossible |
| Conversation persistence | Local JSONL, explicitly internal/unstable | Local sessions exist, but not the documented memory interchange format; importer can bring some recent chats | Resumable conversations, no documented portable transcript schema | Not a stable interoperability layer |
| MCP | `.mcp.json` plus user/local state | `config.toml` and plugin MCP configuration | `.cursor/mcp.json` / `~/.cursor/mcp.json` | Protocol portable; host configuration and auth need adapters |
| Hooks | Claude event and JSON contracts | Codex event, trust, and config contracts | Cursor-native hooks plus partial opt-in Claude compatibility | Scripts may move; wrappers and guarantees do not |
| Subagents | Markdown definitions with rich Claude frontmatter and scoped memory | Agent roles in layered Codex TOML/config | Markdown definitions; also discovers compatibility paths named `.claude/agents` and `.codex/agents` | Prompt bodies portable; Cursor's `.codex/agents` path is not the current native Codex agent-role format |
| Compatibility / migration aids | Manual `CLAUDE.md` import/symlink bridge for `AGENTS.md`; `/init` can incorporate other configs | Generalized “Import from another agent” flow, including recent chats and many configuration categories | Foreign-path discovery, partial Claude-hook support, and Cursor rule/command-to-skill migration | Only Codex documents a generalized cross-agent importer; no common full-fidelity contract exists |

## 2. Automatically loaded instruction files

### Claude Code

Claude Code's durable instruction system is centered on `CLAUDE.md`:

- managed organization `CLAUDE.md`;
- `~/.claude/CLAUDE.md` for user-wide guidance;
- project `CLAUDE.md` or `.claude/CLAUDE.md`;
- `CLAUDE.local.md` for private project guidance; and
- `.claude/rules/**/*.md` for modular or path-scoped rules.

It walks upward from the working directory, concatenates applicable files from broad to specific, and lazily loads nested instructions when it reads files below them. It does **not** directly treat `AGENTS.md` as instructions. Anthropic recommends importing it from `CLAUDE.md`:

```md
@AGENTS.md

## Claude Code

Claude-specific guidance here.
```

This makes `AGENTS.md` content reusable with a one-file adapter. Claude also supports `@path` imports for architecture, design, testing, or other shared documents.

Source: [Claude Code memory and instructions](https://code.claude.com/docs/en/memory).

### Codex

Codex uses the most formal `AGENTS.md` hierarchy of the three:

1. Under `CODEX_HOME`, use `AGENTS.override.md` if present, otherwise `AGENTS.md`.
2. From repository root to current working directory, include at most one non-empty instruction file per directory.
3. Within each directory, try `AGENTS.override.md`, then `AGENTS.md`, then configured fallback filenames.
4. Concatenate from root to leaf; closer guidance wins conflicts.
5. Stop at `project_doc_max_bytes` (32 KiB by default).

`DESIGN.md` is not automatic by default. It can be referenced from `AGENTS.md` or added to `project_doc_fallback_filenames`, but a fallback is selected only when higher-priority names are absent in that directory.

Source: [Codex custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

### Cursor

Cursor currently supports two main repository instruction forms:

- hierarchical `AGENTS.md` at project root and in subdirectories; and
- `.cursor/rules/*.mdc`, which combines Markdown with selector metadata such as `description`, `globs`, and `alwaysApply`.

Nested `AGENTS.md` files combine with their parents and become more specific within their subtree. Cursor CLI also documents automatically reading a root `CLAUDE.md`, but the current editor rules documentation does not promise that behavior for the editor Agent.

Cursor documents the category conflict order **Team Rules → Project Rules → User Rules**, with earlier sources winning. It does not fully document the tie-break between same-scope `AGENTS.md` and `.cursor/rules` instructions.

Source: [Cursor rules](https://cursor.com/docs/rules) and [Cursor CLI usage](https://cursor.com/docs/cli/using).

### What is genuinely common?

The Markdown body is common. The following are not:

- recognized filenames;
- upward versus subtree discovery;
- eager versus lazy loading;
- replacement versus concatenation;
- byte/line limits;
- path selector syntax;
- managed/user/project/local precedence; and
- editor, CLI, cloud, and automation parity.

An instruction migration can preserve text easily, but it must model scope and precedence explicitly to preserve behavior.

## 3. Skills: the strongest common standard

All three products now support the Agent Skills pattern:

```text
skill-name/
├── SKILL.md
├── scripts/       optional
├── references/    optional
└── assets/        optional
```

A safe common-denominator `SKILL.md` is:

```md
---
name: skill-name
description: State clearly when this workflow should and should not be used.
---

# Workflow

Follow these steps...
```

Common behavior:

- a directory is the unit of packaging;
- `SKILL.md` is the entrypoint;
- `name` and `description` are the useful portable metadata;
- supporting files and scripts are loaded or executed when needed; and
- metadata is exposed before the full instructions, reducing startup context.

Key differences:

| Question | Claude Code | Codex | Cursor |
|---|---|---|---|
| Main repo root | `.claude/skills` | `.agents/skills` | `.agents/skills` or `.cursor/skills` |
| User root | `~/.claude/skills` | `~/.agents/skills` | `~/.agents/skills` or `~/.cursor/skills` |
| Reads foreign roots | No broad compatibility promise | No broad compatibility promise | Yes: project/user `.claude/skills` and `.codex/skills` too |
| Nested discovery | Parent roots plus on-demand nested discovery | CWD upward to repo root | Recursive roots and subtree-scoped nested skill directories |
| Path scoping | Claude `paths` and related extensions | Not part of the documented minimal core | Cursor `paths`; legacy `globs` fallback |
| Manual-only control | `disable-model-invocation` | OpenAI policy extension can disable implicit invocation | `disable-model-invocation` |
| Host extension | Rich Claude frontmatter and shell preprocessing | `agents/openai.yaml` for UI, policy, and MCP dependencies | Cursor-specific fields such as `paths` and arbitrary `metadata` |

### Portability conclusion for skills

The core skill package can usually move with little or no content change. The remaining work is:

- materialize it in a discovery path the target reads;
- strip or preserve unsupported frontmatter without changing the common body;
- map tool names, permissions, environment variables, and model settings;
- handle path-scoping degradation; and
- test implicit triggering, because model selection heuristics are not standardized.

Cursor is currently the most permissive consumer because it scans Claude- and Codex-named compatibility roots in addition to `.agents/skills`. This helps migration **into Cursor**, but it should not be mistaken for current Codex-native interoperability: Codex's documented shared skill root is `.agents/skills`, not `.codex/skills`. Reverse portability is not automatic.

Sources: [Claude Code skills](https://code.claude.com/docs/en/skills), [Codex skills](https://learn.chatgpt.com/docs/build-skills), [Cursor skills](https://cursor.com/docs/skills).

## 4. Plugins: shared idea, incompatible packages

All three now use “plugin” to mean an installable bundle of agent capabilities. That conceptual alignment is useful, but none of the three current manifests is a universal package contract.

| Property | Claude Code | Codex | Cursor |
|---|---|---|---|
| Manifest | `.claude-plugin/plugin.json` | `.codex-plugin/plugin.json` | `.cursor-plugin/plugin.json` |
| Required? | Optional; default directories work without it | Required | Required |
| Minimum identity | `name` if manifest exists | Codex plugin identity/manifest; published examples add version and description | `name` |
| Marketplace manifest | `.claude-plugin/marketplace.json` | `.agents/plugins/marketplace.json` (also reads a legacy Claude marketplace path) | `.cursor-plugin/marketplace.json` |
| Namespacing | Plugin-qualified skills/agents | Plugin name used as identifier/component namespace | No stable plugin-qualified component namespace documented |
| Installation model | Marketplace plus versioned local cache | Marketplace plus installed cache | Marketplace/team marketplace plus local development directory |

Codex plugin support is also surface-specific. Current OpenAI documentation lists plugins in ChatGPT Work mode on the web, ChatGPT desktop Work/Codex, and Codex CLI, but **not** in the Codex IDE extension. A valid Codex plugin therefore cannot be assumed to follow a developer across every Codex surface.

The most portable things *inside* plugins are:

1. standards-shaped skills;
2. Markdown prompt/agent bodies;
3. scripts and static assets;
4. MCP server intent; and
5. hook business logic, separate from the event wrapper.

The least portable parts are:

- the manifest and marketplace entry;
- component discovery defaults;
- connector/app IDs and UI metadata;
- namespacing and collision handling;
- install policy and team distribution;
- cache and persistent-data paths; and
- trust, permission, update, and enablement state.

A plugin should therefore be treated as a vendor-specific distribution envelope around potentially portable components, not as the portable primitive itself.

Sources: [Claude plugins](https://code.claude.com/docs/en/plugins-reference), [Codex plugins](https://learn.chatgpt.com/docs/build-plugins), [Cursor plugin reference](https://cursor.com/docs/reference/plugins).

## 5. Memory: the strongest validation of the problem

The products use the word “memory” for different mechanisms.

| Dimension | Claude Code | Codex | Cursor |
|---|---|---|---|
| Default | Auto memory on by default | Local memory off by default | Current interactive-memory default and full contract not documented |
| Scope | Per Git repository; shared across worktrees/subdirectories | Local Codex host; separate from ChatGPT web memory | Historical interactive memory was project/user scoped; automation memory is per automation |
| Main location | `~/.claude/projects/<project>/memory/` | `$CODEX_HOME/memories/` | No documented interactive filesystem path; automation memories live outside worktree |
| Format contract | Plain Markdown; `MEMORY.md` plus optional topic files | Generated state; docs describe categories but not stable filenames/schema | No documented interactive serialization/export contract |
| Startup load | First 200 lines or 25 KB of `MEMORY.md`; topic files on demand | Relevant generated memory may be injected; implementation schema unspecified | Not currently documented as a stable context/storage contract |
| User inspection | `/memory`; files editable/deletable | `/memories` controls; files are inspectable generated state, but manual editing is not primary control | UI controls historically; automation entries inspectable/editable in settings |
| Cross-machine/cloud | Machine-local; not synced to cloud environments | Local store differs from ChatGPT web/Work memory | Storage/synchronization/export are not documented |
| Safe raw migration | Possible to parse, but destination semantics still differ | No published file-level migration contract | No supported raw artifact documented |

### Why raw memory copying is not enough

Even when both sides use Markdown, a memory system also needs:

- project identity and scope;
- retrieval/indexing rules;
- load limits and context budgets;
- confidence and provenance;
- freshness, consolidation, and deletion;
- conflict handling with checked-in instructions;
- consent and privacy boundaries;
- rules for external-tool or web-derived content; and
- writeback behavior.

Claude documents many of these operational details but does not define a cross-agent schema. Codex deliberately documents the directory as generated state without promising stable filenames or serialization. Cursor currently exposes no supported interactive memory file/API contract. Therefore, memory portability is primarily a **semantic extraction and re-ingestion problem**, not a file-copy problem.

Stable team rules should be promoted into reviewed repository guidance. Generated memory should retain its provenance and uncertainty instead of silently becoming mandatory instructions.

Sources: [Claude memory](https://code.claude.com/docs/en/memory), [Codex memories](https://learn.chatgpt.com/docs/customization/memories), [Cursor automation memories](https://cursor.com/docs/cloud-agent/automations#memories).

## 6. MCP, hooks, subagents, settings, and sessions

### MCP

MCP is a genuine interoperability win: servers expose tools and context through a shared protocol. What moves well is server identity, command or URL, transport intent, arguments, tool schemas, and non-secret environment-variable names.

What still needs translation is configuration location and syntax, environment interpolation, OAuth flow, credential storage, trust, tool allow/deny policy, timeouts, and cloud/local availability. MCP makes the integration reusable; it does not make the three client configurations identical.

### Hooks

All three support lifecycle hooks, but event names, matchers, input/output JSON, blocking behavior, concurrency, trust, and supported handler types differ. Hook scripts can be reused when separated from the host wrapper.

Cursor's opt-in Claude-hook compatibility is useful evidence of convergence, but it is partial: some Claude events and tool mappings are explicitly unsupported. It should be treated as an adapter with a compatibility matrix, not as equivalence.

### Subagents

Markdown prompt bodies are portable. Model identifiers, tool grants, read-only/background behavior, worktrees, memory, handoffs, and resume semantics are not. Cursor's discovery of `.claude/agents` and `.codex/agents` provides compatibility paths, but current Codex documents agent roles in layered TOML/config rather than Markdown files under `.codex/agents`. The path name alone therefore does not establish direct compatibility with current Codex subagent artifacts.

### Settings and permissions

- Claude Code centers on JSON settings layers plus `~/.claude.json` state.
- Codex uses layered `config.toml` plus project trust and separate managed requirements.
- Cursor combines VS Code-style settings, product UI rules/team policy, and feature-specific JSON files.

Copying these files wholesale is unsafe because they mix preferences, executable hooks, approvals, trust, credentials, caches, and product-specific keys. A portability layer should map declared intent and require reauthorization rather than transfer secrets or approvals.

### Sessions and chats

Conversation persistence is useful for continuity but is not a common memory API. Claude explicitly labels raw session JSONL internal and changeable. Cursor documents resume operations, not a portable transcript schema. Codex's first-party importer can bring recent chats from supported agents, but its documentation does not promise losslessness or publish the full transformation schema.

## 7. What moves today

### Portable as content, often with no rewrite

- the Markdown body of repository instructions;
- `AGENTS.md` between Codex and Cursor;
- `AGENTS.md` into Claude through a tiny `CLAUDE.md` import or symlink;
- common-denominator `SKILL.md` packages;
- reference documents, examples, templates, scripts, and assets;
- ordinary architecture/design/testing docs; and
- MCP server and tool semantics.

### Portable with an adapter

- instruction lookup, hierarchy, overrides, and conditional activation;
- `.cursor/rules/*.mdc` and `.claude/rules/*.md` selectors;
- skill path scoping, invocation controls, tools, models, and host metadata;
- MCP client configuration and authentication;
- hook events and payloads;
- subagent frontmatter and orchestration;
- commands converted into skills;
- plugin components unpacked and repackaged per vendor; and
- reviewed semantic facts extracted from memory.

### Not safely portable as a raw artifact

- generated memory directories as a universal contract;
- Cursor interactive memory, because no supported storage/export interface is documented;
- raw conversation databases or internal JSONL;
- plugin caches and installed-state directories;
- marketplace/install/enablement state;
- secrets, OAuth tokens, trust decisions, or command approvals;
- UI-managed user/team rules without an explicit export API; and
- cloud/account memory assumed to be equivalent to local agent memory.

## 8. Problem validation

### Which parts of the hypothesis are confirmed?

1. **Memory lock-in is substantial.** It is the least standardized layer and in Cursor's case is currently opaque at the documented file/API level.
2. **Behavioral lock-in is substantial.** The same text can produce different results because scope, precedence, triggering, tools, and lifecycle semantics differ.
3. **Plugin lock-in is substantial.** The products have converged on the bundle concept, not on one installable format.
4. **Personal and organization configuration remains fragmented.** User rules, team rules, approvals, secrets, and local state usually sit outside the repository.
5. **Surface fragmentation matters.** CLI, editor, desktop, web/cloud agents, automations, and code review do not always consume the same configuration even within one vendor.

### Which parts are becoming less true?

1. **Skills are no longer wholly trapped.** All three use the Agent Skills pattern, and Cursor explicitly reads foreign skill roots.
2. **Repository instructions have a viable common center.** `AGENTS.md` works directly in Codex and Cursor, and Claude documents an import/symlink bridge.
3. **External tools are less locked in.** MCP provides a common protocol even though client configuration differs.
4. **Vendors are adding migration aids.** Codex offers the only generalized first-party external-agent import workflow documented here. Cursor provides compatibility discovery and partial Claude-hook support, while Claude documents manual `AGENTS.md` bridges and packaging aids. These are materially different levels of migration support.

### Final validation

The opportunity is validated, but a product framed only as “sync my Markdown files” would address the easiest and increasingly standardized part of the problem. The durable unmet need is:

> Preserve a developer's agentic operating environment—knowledge, scope, activation semantics, workflows, integrations, provenance, and learned memory—while adapting it safely to each harness's capabilities.

That is meaningfully different from a dotfiles synchronizer. It requires a neutral semantic model, per-agent adapters, explicit loss reporting, reauthorization boundaries, and behavioral conformance tests. Those are solution requirements suggested by the research, not evidence that one implementation approach has already won.

### What this documentation study does not validate

This is strong **technical** validation of portability friction. It does not by itself prove:

- that most developers primarily use one agent;
- how often developers want to switch or use several agents in parallel;
- whether memory loss is a larger pain than cost, model quality, security, or workflow disruption;
- willingness to pay for a portability layer;
- how much current vendor import/compatibility features already reduce perceived pain; or
- the completeness of competing third-party migration products.

Those claims require user interviews, behavioral data, migration experiments, and competitive research. The documentation establishes that meaningful incompatibilities exist; it does not establish market size or product demand on its own.

## 9. Confidence and change-sensitive gaps

Confidence is high for documented file paths and current public formats. The main gaps worth validating with a small fixture repository are:

- same-scope precedence between Cursor `AGENTS.md` and `.cursor/rules`;
- duplicate skill/component collision behavior across Cursor compatibility roots and plugins;
- current Cursor interactive-memory storage and export capabilities;
- exact lossiness of Codex's external-agent importer;
- cloud/editor/CLI parity for user and project customizations;
- cross-product handling of unsupported skill fields; and
- hook behavior where event names look similar but blocking or concurrency semantics differ.

Because these products move quickly, any implementation should version its compatibility claims and rerun conformance tests against installed client versions rather than relying indefinitely on this snapshot.

## Primary source set

All sources were accessed on **2026-07-18**. Full source inventories and product-specific caveats are in the three detailed reports.

### Claude Code

- [Instructions and memory](https://code.claude.com/docs/en/memory)
- [Skills](https://code.claude.com/docs/en/skills)
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [MCP](https://code.claude.com/docs/en/mcp)
- [Hooks](https://code.claude.com/docs/en/hooks)

### Codex

- [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Skills](https://learn.chatgpt.com/docs/build-skills)
- [Plugins](https://learn.chatgpt.com/docs/build-plugins)
- [Memories](https://learn.chatgpt.com/docs/customization/memories)
- [Import from another agent](https://learn.chatgpt.com/docs/import)
- [MCP](https://learn.chatgpt.com/docs/extend/mcp)
- [Hooks](https://learn.chatgpt.com/docs/hooks)

### Cursor

- [Rules](https://cursor.com/docs/rules)
- [Skills](https://cursor.com/docs/skills)
- [Plugins](https://cursor.com/docs/plugins)
- [Plugin reference](https://cursor.com/docs/reference/plugins)
- [MCP](https://cursor.com/docs/mcp)
- [Hooks](https://cursor.com/docs/hooks)
- [Third-party hook compatibility](https://cursor.com/docs/reference/third-party-hooks)
- [Subagents](https://cursor.com/docs/subagents)
- [Automation memories](https://cursor.com/docs/cloud-agent/automations#memories)
