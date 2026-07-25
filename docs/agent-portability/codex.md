# Codex portability profile

**Research date:** 2026-07-18  
**Scope:** Current first-party Codex documentation for the ChatGPT desktop app, Codex CLI, IDE extension, and relevant hosted surfaces.  
**Evidence policy:** This report treats the current OpenAI Codex manual and the first-party pages it incorporates as the product contract. It does not infer undocumented file schemas from a particular local installation. Explicit documentation gaps are called out rather than filled with implementation guesses.

## Executive summary

Codex has four distinct portability layers:

1. **Repository instructions are highly portable.** `AGENTS.md` is plain Markdown, can be checked into a repository, and has a precisely documented hierarchy. `AGENTS.override.md` is Codex's override convention. Other filenames such as `DESIGN.md` are not automatically instructions unless they are named in `project_doc_fallback_filenames` or deliberately referenced from an active instruction file.
2. **Skills are structurally portable.** A skill is a folder containing `SKILL.md` with YAML front matter (`name`, `description`) plus optional scripts, references, assets, and `agents/openai.yaml`. OpenAI says Codex builds on the open Agent Skills standard. Repository skills live under `.agents/skills`; personal skills under `$HOME/.agents/skills`. Codex initially loads only skill metadata, then reads the full skill when selected.
3. **Plugins are a Codex distribution system, not just a directory of prompts.** A plugin requires `.codex-plugin/plugin.json` and may bundle skills, hooks, MCP configuration, app/connector mappings, and assets. Discovery and installation are marketplace-driven. This makes a plugin portable as a package only where the destination agent understands the same manifest and component conventions; its individual `SKILL.md`, MCP, and hook concepts may still be transformable.
4. **Memory is the least directly portable layer.** Local Codex memory is generated state under `~/.codex/memories/`, separate from ChatGPT web memory. The public documentation describes summaries, durable entries, recent inputs, supporting evidence, lifecycle, and controls, but does not publish stable filenames, a serialization schema, or an import/export contract for those files. Durable rules should therefore live in `AGENTS.md` or checked-in docs, not only in memory.

The most important current portability feature is Codex's first-party **Import from another agent** flow. OpenAI documents imports for instruction files, `settings.json`, skills, plugins, project folders, recent chats, MCP configuration, hooks, slash commands, and subagents, with destinations in Codex-native surfaces. The docs also warn that auth, permissions, hooks, and placeholder semantics need review after conversion. The page does not publish a complete per-source transformation schema, so the importer should be treated as an assisted migration tool, not proof of lossless compatibility.

## 1. Automatically discovered Markdown and instruction files

### The automatic instruction chain

Codex builds its instruction chain once when a run starts (normally once per launched TUI session). The documented lookup is exact:

1. **Global scope:** under `CODEX_HOME` (default `~/.codex`), Codex reads `AGENTS.override.md` if it exists; otherwise it reads `AGENTS.md`. It uses only the first non-empty global file.
2. **Project scope:** Codex identifies a project root, normally the Git root, then walks from that root down to the current working directory. If no project root is found, it checks only the current directory.
3. **Within each directory:** it checks `AGENTS.override.md`, then `AGENTS.md`, then each configured name in `project_doc_fallback_filenames`. It includes at most one non-empty file per directory.
4. **Merge and precedence:** files are concatenated root-to-leaf with blank lines. Guidance closer to the current working directory appears later and therefore wins on conflict.
5. **Limit:** empty files are skipped. Collection stops when combined content reaches `project_doc_max_bytes`, 32 KiB by default.

This behavior is documented in [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) and the corresponding [advanced configuration section](https://learn.chatgpt.com/docs/config-file/config-advanced#project-instructions-discovery).

Example:

```text
~/.codex/AGENTS.md                  global defaults
repo/AGENTS.md                      shared repo guidance
repo/services/AGENTS.md             service guidance
repo/services/payments/
  AGENTS.override.md                selected instead of AGENTS.md in this directory
```

When Codex starts in `repo/services/payments`, it loads the global file, then the repo file, then the service file, then the payments override. The last applicable guidance has the highest practical precedence.

### What happens to `DESIGN.md`, `ARCHITECTURE.md`, and similar files?

They are **ordinary repository files, not automatic instruction files by name**. There are two documented ways to make such material part of durable guidance:

- Add the filename to `project_doc_fallback_filenames` in `config.toml`. It then participates in the one-file-per-directory lookup after `AGENTS.override.md` and `AGENTS.md`.
- Keep `AGENTS.md` concise and explicitly route Codex to task-specific Markdown such as architecture, planning, or review documents when relevant.

For example:

```toml
project_doc_fallback_filenames = ["TEAM_GUIDE.md", "DESIGN.md"]
project_doc_max_bytes = 65536
```

With that setting, the order inside each directory is `AGENTS.override.md`, `AGENTS.md`, `TEAM_GUIDE.md`, then `DESIGN.md`. A higher-priority file suppresses lower-priority fallback files in the same directory; the files are not all merged.

### Additional instruction surfaces

- `developer_instructions` in `config.toml` injects additional instructions before `AGENTS.md`.
- `model_instructions_file` is a configured file path that replaces the built-in base instructions. It is not automatic Markdown discovery and should be treated as a Codex-specific, high-impact override.
- Deprecated custom prompts are top-level Markdown files under `~/.codex/prompts/`. They require explicit `/prompts:name` invocation, can have `description` and `argument-hint` YAML fields plus positional/named placeholders, and are not repo-shared. OpenAI recommends skills instead.
- For GitHub code review, Codex separately documents repository-wide search and applying the closest `AGENTS.md` to each changed file. This is a review-specific traversal nuance beyond the local run's root-to-current-working-directory chain.

### Portability assessment

| Artifact | Portability | Notes |
|---|---:|---|
| Plain guidance inside `AGENTS.md` | High | Markdown content and repo placement travel cleanly; another agent may use a different filename or precedence algorithm. |
| Nested scoping | Medium-high | The intent is portable; exact handling of overrides and launch directory is host-specific. |
| `AGENTS.override.md` | Medium | Plain Markdown, but the filename and replacement behavior are Codex conventions. |
| Fallback names | Medium-low | Requires Codex `config.toml`; a destination needs an equivalent mapping. |
| `developer_instructions` / `model_instructions_file` | Low | Codex configuration semantics, not a cross-agent instruction standard. |
| `~/.codex/prompts/*.md` | Low-medium | Content is reusable, but command metadata, placeholders, and explicit invocation need conversion. The surface is deprecated. |

## 2. Skills

### Required format and structure

A skill is a directory whose required entry point is `SKILL.md`. The minimum documented form is:

```md
---
name: skill-name
description: Explain exactly when this skill should and should not trigger.
---

Imperative instructions for Codex to follow.
```

`name` and `description` are required. The directory may also contain:

```text
skill-name/
├── SKILL.md                 required
├── scripts/                 optional deterministic helpers
├── references/              optional supporting material
├── assets/                  optional reusable assets
└── agents/
    └── openai.yaml          optional OpenAI UI, invocation, and dependency metadata
```

`agents/openai.yaml` may define:

- `interface` fields such as display name, descriptions, icons, brand color, and a default prompt;
- `policy.allow_implicit_invocation` (default `true`); and
- tool dependencies, including MCP server name, transport, and URL.

The skill's core `SKILL.md` is the portable part. `agents/openai.yaml` is an OpenAI extension and should be separated from cross-agent workflow logic.

### Discovery locations

Codex reads skills from four scopes:

| Scope | Location | Behavior |
|---|---|---|
| Repository | `.agents/skills` in every directory from `$CWD` up to `$REPO_ROOT` | Makes folder-, subtree-, and repo-relevant skills available. |
| User | `$HOME/.agents/skills` | Personal skills available across repositories. |
| Admin | `/etc/codex/skills` | Machine/container defaults shared across users. |
| System | Bundled with Codex | OpenAI-provided skills. |

Codex follows symlinked skill folders. If two skills have the same `name`, Codex does not merge them; both may appear in selectors. The documentation does not promise a same-name winner, so portable tooling should make names unique rather than depend on shadowing.

### Selection and loading

Codex uses progressive disclosure:

1. At session start it exposes each available skill's `name`, `description`, and path to the model.
2. A skill may be selected explicitly (`$skill-name`, `/skills`, or the skill selector) or implicitly when the task matches its description.
3. Only when selected does Codex read the complete `SKILL.md`.
4. References and scripts are read or run only when needed.

The initial skill list is budgeted to at most 2% of the model context window, or 8,000 characters when the window is unknown. Codex shortens descriptions first and may omit skills, with a warning, when there are too many. The full selected skill is still read after selection.

Skill changes are normally detected automatically; restarting is the documented fallback if an update does not appear. Individual skills can be disabled, without deletion, through `[[skills.config]]` entries in `~/.codex/config.toml` keyed by the exact `SKILL.md` path.

### Portability assessment

- **High:** Markdown instructions, YAML `name`/`description`, focused directory-per-skill structure, references, scripts, and assets.
- **Medium:** implicit matching, because trigger quality and host selection heuristics differ even when the same description is accepted.
- **Medium-low:** exact discovery roots and same-name behavior.
- **Low:** `agents/openai.yaml` UI policy and automatic MCP dependency wiring unless another agent implements the OpenAI extension.

## 3. Plugins

### What a Codex plugin is

A Codex plugin is an installable bundle. Its required entry point is:

```text
plugin-root/.codex-plugin/plugin.json
```

Only `plugin.json` belongs in `.codex-plugin/`. Optional components stay at the plugin root:

```text
plugin-root/
├── .codex-plugin/
│   └── plugin.json          required
├── skills/                  optional one or more skills
├── hooks/                   optional lifecycle hooks
├── assets/                  optional presentation assets
├── .mcp.json                optional MCP server configuration
└── .app.json                optional connector/app mappings
```

A minimal manifest is:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Reusable workflow",
  "skills": "./skills/"
}
```

OpenAI recommends a stable kebab-case `name`; Codex uses it as the plugin identifier and component namespace. A richer published manifest may include author, homepage, repository, license, keywords, paths for `skills`, `mcpServers`, `apps`, and `hooks`, plus install-surface `interface` metadata such as display names, descriptions, legal links, icons, screenshots, category, capabilities, and starter prompts.

Bundled component paths are plugin-root-relative. The documented hook rules require `./`-prefixed paths to remain inside the plugin root. Plugin hooks may also use the default `hooks/hooks.json`; a manifest `hooks` entry replaces that default and may be one path, multiple paths, inline hook objects, or arrays of inline objects.

### Discovery, marketplace, installation, and state

Plugins are marketplace-driven rather than automatically loaded from any arbitrary plugin folder.

- Repo marketplace: `$REPO_ROOT/.agents/plugins/marketplace.json`
- Personal marketplace: `~/.agents/plugins/marketplace.json`
- Legacy-compatible repo marketplace: `$REPO_ROOT/.claude-plugin/marketplace.json`
- Curated OpenAI marketplace: built into the Plugins Directory

A marketplace JSON file contains a marketplace `name`, optional display metadata, and `plugins[]` entries. Each entry identifies a plugin source and install policy. Documented source forms include local paths, Git repositories/subdirectories with optional refs or SHAs, and npm packages. Local `source.path` values are resolved relative to the marketplace root, must start with `./`, and must remain inside that root.

The ChatGPT desktop app installs bundles into:

```text
~/.codex/plugins/cache/$MARKETPLACE_NAME/$PLUGIN_NAME/$VERSION/
```

Local plugins use version `local`, and the app loads the cached installed copy rather than directly executing the marketplace source tree. Plugin enabled/disabled state is stored in `~/.codex/config.toml`. In Codex CLI, `/plugins` opens the marketplace-grouped browser for install, uninstall, enable, and disable operations. Newly installed bundled skills or tools are available in a new chat or CLI session.

Surface support matters: first-party docs currently say plugins are available in Work mode on ChatGPT web, Work mode or Codex in the desktop app, and through the Codex CLI plugin browser; they are not available in Chat mode, the Codex IDE extension, or mobile.

### Plugin component behavior relevant to migration

- Skills retain their `SKILL.md` structure and are the most reusable plugin component.
- MCP servers expose tools and context but may require transport/auth conversion or reauthorization.
- Hooks use Codex lifecycle schemas and trust review. Installing/enabling a plugin does not automatically trust its command hooks.
- Apps/connectors can require ChatGPT-specific IDs, authorization, and UI behavior.
- Plugin-bundled MCP policy can be overridden in `config.toml` under `plugins."plugin@marketplace".mcp_servers...`, showing that installed identity includes both plugin and marketplace.
- Codex sets `PLUGIN_ROOT` and `PLUGIN_DATA` for plugin hooks and also sets `CLAUDE_PLUGIN_ROOT` and `CLAUDE_PLUGIN_DATA` for compatibility. This is a useful compatibility seam, but it does not establish full Claude/Codex plugin equivalence.

### Portability assessment

| Component | Portability | Why |
|---|---:|---|
| Bundled `SKILL.md` workflows | High | Plain skill structure; isolate OpenAI-only metadata. |
| Reference files, scripts, assets | High-medium | Files travel; runtime, permissions, paths, and tool names may not. |
| `.mcp.json` intent | Medium | MCP is a standard, but host config shape, auth storage, and approval policy differ. |
| Hook scripts | Medium | Business logic travels; event names, JSON I/O, trust, paths, and blocking semantics need adapters. |
| `.codex-plugin/plugin.json` | Low outside Codex | Codex packaging and install metadata. |
| Marketplace/catalog metadata | Low | Codex-specific discovery, policy, caching, and installation model. |
| `.app.json` connectors/UI | Low | Tied to ChatGPT/Codex app identities and authorization. |

## 4. Memory

### Product boundaries

OpenAI documents two separate memory systems:

- **Local Codex clients** (desktop Codex, Codex CLI, and the connected IDE host) use a local Codex memory store and local controls.
- **ChatGPT web / Work mode** uses ChatGPT memory settings for the account/workspace and does not use the local Codex memory store or its controls.

This distinction is crucial for portability: moving a local Codex home directory is not the same as moving ChatGPT account memory, and a web chat cannot be assumed to see local files.

### Generation and use

Local memories are off by default. When enabled, Codex can turn useful context from eligible prior chats into local memory files. Generation is asynchronous: Codex skips active or short-lived sessions, waits for sufficient idle time, redacts secrets from generated memory fields, and may skip generation when remaining Codex quota is below a configured threshold.

The main storage directory is:

```text
$CODEX_HOME/memories/       # defaults to ~/.codex/memories/
```

The public docs describe its contents as summaries, durable entries, recent inputs, and supporting evidence from prior chats. They explicitly call these files **generated state** and advise against treating hand-editing as the primary control surface.

Per-chat `/memories` controls independently determine:

- whether the current chat may use existing local memories; and
- whether the current chat may contribute to future memory generation.

Those choices do not change global settings. Global/config controls include:

```toml
[features]
memories = true

[memories]
generate_memories = true
use_memories = true
disable_on_external_context = false
min_rate_limit_remaining_percent = 0
# extract_model = "..."
# consolidation_model = "..."
```

`disable_on_external_context` can exclude chats that used MCP, web search, or tool search from memory generation. The legacy `no_memories_if_mcp_or_web_search` name remains accepted as an alias. The extraction and consolidation model settings control per-chat extraction and global consolidation respectively.

### What the public docs do not specify

The current first-party memory page does **not** publish:

- stable filenames within `~/.codex/memories/`;
- a versioned JSON, Markdown, JSONL, database, or other serialization schema;
- merge/precedence rules among individual generated memory files;
- an official file-level import/export API; or
- a promise that copying the directory between Codex versions or machines is supported.

Accordingly, this report does not present observed local filenames as a portable contract. The safe migration boundary is semantic: extract user preferences, durable project facts, and useful prior-work summaries, then re-encode them in the destination agent's supported instruction or memory surfaces. Required team rules belong in `AGENTS.md` or checked-in documentation, as OpenAI explicitly recommends.

### Portability assessment

- **High:** semantic facts and preferences after review; durable rules moved into repo docs.
- **Medium:** recent-chat content where the supported import flow can convert it.
- **Low:** direct file-copy portability of generated memory state, because the public format is unspecified.
- **Not equivalent:** local Codex memory and ChatGPT web memory.

## 5. Adjacent portability surfaces

### `config.toml`

Codex configuration is TOML with documented precedence, highest first:

1. CLI flags and `--config`
2. trusted project `.codex/config.toml` files from root to CWD, closest wins
3. selected `~/.codex/<profile>.config.toml`
4. user `~/.codex/config.toml`
5. Unix system `/etc/codex/config.toml`
6. built-in defaults

Project layers load only for trusted projects and cannot override sensitive host/provider keys such as credential-routing, provider auth, profiles, notifications, or telemetry. This layered TOML is highly useful to a portability tool as an input model, but its keys and trust rules are Codex-specific.

### MCP

Codex CLI, the IDE extension, and the ChatGPT desktop app share MCP configuration on the same Codex host. User servers live in `~/.codex/config.toml`; trusted projects can add `.codex/config.toml`. Codex supports local stdio and streamable HTTP servers, including bearer-token and OAuth options, server instructions, tool allow/deny lists, and per-server/per-tool approval policies.

MCP is one of the best cross-agent portability seams because server protocols and tool schemas can remain stable. The conversion-sensitive parts are host configuration syntax, environment-variable forwarding, credential storage, OAuth callbacks, approval defaults, and any model-facing server instructions.

### Hooks

Codex loads `hooks.json` and/or inline `[hooks]` next to active config layers. User and project examples are `~/.codex/hooks.json`, `~/.codex/config.toml`, `$PROJECT/.codex/hooks.json`, and `$PROJECT/.codex/config.toml`; enabled plugins may add hooks too. Project hooks require project trust. Matching hooks from all sources are additive, and non-managed command hooks require review/trust tied to the hook definition's hash.

Hook scripts may be reusable, but the event model, matcher semantics, JSON input/output, concurrency, trust, and environment variables need explicit adapters. Treat the script logic as portable and the lifecycle wrapper as host-specific.

### Commands and automations

- Built-in slash commands are UI operations, not portable files.
- Deprecated custom prompts under `~/.codex/prompts/*.md` can be converted into skills; the docs' import flow does this for supported source-agent slash commands.
- Scheduled tasks and task templates are product surfaces rather than a documented repository file standard. Portability should capture schedule, prompt, workspace, permissions, and completion behavior as neutral data, then generate host-specific automation configuration.

### First-party import from another agent

The desktop import flow is the strongest evidence that the portability problem is recognized. OpenAI documents the following categories and Codex destinations:

| Source category | Codex destination |
|---|---|
| Instruction files | `AGENTS.md` |
| `settings.json` | `config.toml` |
| Skills | Codex skills |
| Plugins | Codex plugins |
| Project folders | Projects using the same folders |
| Chats from the last 30 days | ChatGPT chats |
| MCP server configuration | Codex MCP configuration |
| Hooks | Codex hooks |
| Slash commands | Skills |
| Subagents | Codex agents |

The CLI command reference describes `/import` as importing Claude Code configuration, project files, and recent chats. The broader desktop import page says users choose from supported agents but does not publish a complete source-agent list or a field-by-field mapping. It also directs users to review tool restrictions, MCP auth and transports, hook behavior, plugin/marketplace setup, and prompt placeholder semantics afterward. This is assisted conversion, not a stated guarantee of behavioral identity or lossless memory transfer.

## 6. Practical portability notes for a multi-agent system

### A useful neutral intermediate model

Do not equate each agent's home directory with a portable profile. Normalize into layers:

```text
portable-profile/
├── instructions/
│   ├── global.md
│   └── scopes[]              path + priority + content
├── skills[]
│   ├── metadata              name + trigger description
│   ├── instructions.md
│   ├── references/
│   ├── scripts/
│   └── host_extensions/
├── integrations/
│   ├── mcp_servers[]
│   └── credential_requirements[]
├── hooks[]                   neutral event + adapter + script
├── plugins[]                 package identity + components
├── memory/
│   ├── durable_facts[]
│   ├── preferences[]
│   └── provenance[]
└── host_configs/
    └── codex/                lossless Codex-only fields
```

This preserves common semantics without discarding host-specific configuration.

### What can move easily into or out of Codex

- Plain Markdown instructions after translating filename and precedence.
- Skills that use the common `SKILL.md` core and do not hard-code host tool names.
- References, examples, assets, and scripts whose runtime dependencies are available.
- MCP server identity, transport, and tool contracts, after regenerating host config and reauthorizing.
- The semantic content of memories after review and provenance tagging.

### What needs an adapter or human review

- Override precedence and scope derived from launch CWD.
- Implicit skill triggering and invocation-policy extensions.
- Hook event names, matchers, trust, I/O, and concurrency.
- Plugin manifests, marketplaces, component namespaces, cache/install state, connector IDs, and UI metadata.
- Auth material: migrate requirements and references, not secrets by default.
- Memory files: extract meaning; do not promise binary or file-level compatibility.
- Slash-command placeholders and shell interpolation.

### Design implications

1. **Preserve provenance.** Every imported rule or fact should retain source agent, source file/chat, timestamp, and scope.
2. **Separate declarative intent from runtime glue.** A skill's workflow is not the same thing as its Codex UI metadata or MCP installer.
3. **Detect collisions instead of silently choosing.** Codex itself may show duplicate skill names; a cross-agent system should require explicit identity or namespace resolution.
4. **Make lossy conversions visible.** Generate a migration report for dropped config keys, unsupported hook events, missing plugin components, and unauthorised connections.
5. **Promote durable memory carefully.** Offer reviewed promotion of recurring project facts into checked-in guidance; never silently turn uncertain generated memory into mandatory repository rules.
6. **Test behavior, not just syntax.** After migration, run representative prompts to verify instruction precedence, skill triggering, MCP availability, and hook outcomes.

## 7. Published behavior, observations, and gaps

| Category | Treatment in this report |
|---|---|
| Published behavior | All affirmative product claims above come from current first-party OpenAI documentation listed below. |
| Current-session observations | None used as a product contract. Local directory contents and surfaced runtime instructions may be version-, account-, or rollout-specific. |
| Documentation gaps | Exact memory file schema and filenames; losslessness and detailed mappings of external-agent import; complete collision-resolution semantics for same-name skills; cross-agent equivalence of plugin manifests and hook events. |

## Sources

All sources were accessed on **2026-07-18**.

| First-party source | Main coverage |
|---|---|
| [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) | Exact global/project lookup, precedence, fallback names, limits, refresh behavior |
| [Build skills](https://learn.chatgpt.com/docs/build-skills) | Skill schema, locations, progressive disclosure, invocation, optional metadata |
| [Build plugins](https://learn.chatgpt.com/docs/build-plugins) | Manifest, package layout, marketplaces, sources, install cache, hook/MCP/app packaging |
| [Plugins](https://learn.chatgpt.com/docs/plugins) | Supported surfaces, browser/install/enable lifecycle, permissions, components |
| [Memories](https://learn.chatgpt.com/docs/customization/memories) | Local-vs-web boundary, generation lifecycle, storage root, controls, config keys |
| [Config basics](https://learn.chatgpt.com/docs/config-file/config-basic) | Config files and precedence |
| [Advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced) | State locations, project config traversal/trust, instruction discovery controls |
| [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) | Instruction overrides, skill overrides, memory and plugin settings |
| [Hooks](https://learn.chatgpt.com/docs/hooks) | Hook locations, additive behavior, trust, event/config shape, plugin compatibility variables |
| [Model Context Protocol](https://learn.chatgpt.com/docs/extend/mcp) | Shared host config, transports, auth, tool policy, plugin-provided MCP |
| [Custom prompts](https://learn.chatgpt.com/docs/custom-prompts) | Deprecated prompt files, metadata, placeholders, invocation and location |
| [Import from another agent](https://learn.chatgpt.com/docs/import) | Supported migration categories, destinations, safety review and limitations |
| [Slash commands in Codex CLI](https://learn.chatgpt.com/docs/developer-commands?surface=cli) | `/import`, `/plugins`, `/skills`, `/memories`, `/mcp`, and related command behavior |
| [Codex code review in GitHub](https://learn.chatgpt.com/docs/third-party/github) | Review-specific closest-`AGENTS.md` behavior |

