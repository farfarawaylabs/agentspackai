# Claude Code configuration, skills, plugins, and memory

**Research date:** 2026-07-18  
**Scope:** Claude Code CLI and repository configuration. Facts below come only from current Anthropic documentation. Version qualifiers are preserved where the docs provide them.

## Executive summary

Claude Code has a fairly portable **project-authored layer** and a much less portable **runtime-state layer**:

- The strongest portable primitives are plain Markdown instructions (`CLAUDE.md`, `.claude/rules/**/*.md`) and Agent Skills (`.claude/skills/<name>/SKILL.md` plus supporting files). Claude Code explicitly follows the open Agent Skills standard, while adding Claude-specific frontmatter and runtime behavior. [S1][S2]
- Claude Code does **not** automatically treat `AGENTS.md`, `DESIGN.md`, or arbitrary Markdown files as standing instructions. `AGENTS.md` must be imported from `CLAUDE.md` (or symlinked to it); arbitrary files can be imported with `@path`. Anthropic documents no automatic instruction-file role for `DESIGN.md`. [S1]
- Its plugin system is broad but Claude-specific: a self-contained directory can bundle skills, subagents, hooks, MCP/LSP servers, commands, output styles, themes, monitors, executables, and limited default settings. A manifest is optional at `.claude-plugin/plugin.json`; when present, only `name` is required. [S3][S4]
- “Memory” is not one thing. Claude Code separates user-authored persistent instructions, machine-local auto memory, optional subagent memory, and resumable conversation transcripts. Only the first and project-scoped subagent memory are naturally source-controlled. Auto memory and transcripts are local runtime data. [S1][S8][S9][S10]
- MCP is the cleanest tool-integration portability surface because it is based on the Model Context Protocol and project servers use a conventional `.mcp.json`. Claude-specific scoping, trust, naming, and plugin wrappers still need adaptation. [S7]
- Do not build interchange on Claude’s raw session JSONL. Anthropic explicitly calls its entry format internal and subject to change between releases. [S10]

## Status key

- **Documented:** current first-party behavior.
- **Version-gated:** documented behavior requiring the stated Claude Code version.
- **Experimental:** Anthropic says the schema/component may change.
- **Gap:** no first-party portable contract is documented.

## 1. Automatically discovered Markdown and instruction files

### 1.1 Files with instruction semantics

| File or pattern | Scope and location | Load behavior | Portability implication |
|---|---|---|---|
| Managed `CLAUDE.md` | macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`; Linux/WSL `/etc/claude-code/CLAUDE.md`; Windows `C:\Program Files\ClaudeCode\CLAUDE.md` | Organization-wide, loaded before user/project instructions; cannot be excluded by users | Plain Markdown, but OS path and managed-policy semantics are Claude-specific |
| User `CLAUDE.md` | `~/.claude/CLAUDE.md` | Loaded for all projects | Easy content migration; path/name need mapping |
| Project `CLAUDE.md` | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Loaded as team project instructions | Easy content migration; `CLAUDE.md` is Claude-specific |
| Local `CLAUDE.local.md` | `./CLAUDE.local.md` | Personal, project-specific; should be gitignored | Easy content migration if intentionally copied; normally machine-only |
| Rules | Project `.claude/rules/**/*.md`; user `~/.claude/rules/**/*.md` | Recursively discovered. Rules without `paths` frontmatter load unconditionally; path-scoped rules load when Claude reads a matching file | Markdown body is portable; discovery path and `paths` YAML contract need mapping |

These files are behavioral context, not enforcement. Anthropic says `CLAUDE.md` is delivered as a user message after the system prompt; conflicting or vague instructions may be followed inconsistently. Permissions and hooks are the enforcement layer. [S1]

### 1.2 Exact `CLAUDE.md` lookup and ordering

At launch, Claude Code walks upward from the current working directory and looks for `CLAUDE.md` and `CLAUDE.local.md` in each directory. All discovered files are concatenated; they do not replace one another. Content is ordered from filesystem root toward the working directory. Within one directory, `CLAUDE.local.md` is appended after `CLAUDE.md`. Thus, closer and local instructions appear later, but there is no hard conflict-resolution engine: Claude uses judgment. Project instructions also come after user instructions in the documented broad-to-specific load order. [S1]

Under the starting directory, nested `CLAUDE.md` and `CLAUDE.local.md` files are discovered lazily and added when Claude reads files in those subdirectories. `claudeMdExcludes` can skip specified instruction/rule files using absolute-path glob matching, except managed instructions. [S1]

For extra directories granted with `--add-dir`, instruction files are **not** loaded by default. Setting `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` also loads that directory’s `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/rules/*.md`, and `CLAUDE.local.md`. [S1]

### 1.3 Imports and arbitrary Markdown

A `CLAUDE.md` file can import relative or absolute files with `@path/to/file`. Relative paths resolve from the importing file. Imports may recurse up to four hops and are expanded into startup context; external imports require one-time approval. This is the documented way to reuse `DESIGN.md`, README material, or a cross-agent instruction file without copying it. [S1]

Claude Code specifically says it reads `CLAUDE.md`, **not** `AGENTS.md`. Anthropic recommends a tiny bridge:

```md
@AGENTS.md

## Claude Code

Claude-specific instructions here.
```

A symlink from `CLAUDE.md` to `AGENTS.md` also works. `/init` can read an existing `AGENTS.md` and incorporate relevant content into a generated `CLAUDE.md`; it also inspects some other agents’ rule files during generation. That is a migration aid, not ongoing automatic discovery of those files. [S1]

**Gap:** Anthropic documents no general scan that automatically loads `DESIGN.md`, `README.md`, or every Markdown file as persistent instructions. They enter context only through an explicit import, a skill/rule mechanism, a user reference, or ordinary file reading during work. [S1][S2]

## 2. Skills

### 2.1 Format and directory structure

A skill is a directory whose required entrypoint is `SKILL.md`. The file consists of optional YAML frontmatter followed by Markdown instructions. Supporting Markdown, templates, examples, and scripts can live beside it; `SKILL.md` should link to them so Claude knows when to read or execute them. Anthropic recommends keeping `SKILL.md` under 500 lines and moving detail into supporting files. [S2]

```text
my-skill/
├── SKILL.md          # required entrypoint
├── reference.md      # optional, read on demand
├── examples/         # optional
└── scripts/          # optional helpers, executed rather than injected wholesale
```

Standard locations are:

| Scope | Location | Conflict behavior |
|---|---|---|
| Enterprise | Deployed through managed settings | Overrides personal and project skills |
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | Overrides project and bundled skills of the same name |
| Project | `.claude/skills/<skill-name>/SKILL.md` | Overrides bundled skills of the same name |
| Plugin | `<plugin>/skills/<skill-name>/SKILL.md` | Namespaced as `plugin-name:skill-name`, avoiding ordinary name conflicts |

Legacy `.claude/commands/<name>.md` files use the same mechanism and still create `/<name>`, but skills take precedence over commands of the same name. Skills are recommended because they can bundle supporting files. [S2]

### 2.2 Discovery and loading

Project skills are discovered in `.claude/skills/` in the starting directory and every parent up to the repository root. Nested `.claude/skills/` directories below the start are discovered on demand as Claude works with files there. Name collisions with nested skills do not discard either definition: nested variants receive a directory-qualified name such as `apps/web:deploy`; the root `/deploy` remains the unqualified command. [S2]

Unlike most configuration, `.claude/skills/` inside a `--add-dir` or `/add-dir` directory is automatically loaded. A directory added only through `permissions.additionalDirectories` grants file access but does not discover skills. Local skill text changes are watched live; creation of a previously absent top-level skills directory requires restart. [S2]

At normal session start, Claude receives model-invocable skill names and descriptions, not full bodies. The full rendered `SKILL.md` loads when the user or model invokes it, enters the conversation as one message, and stays in context for the rest of that session. `disable-model-invocation: true` hides the description from Claude and makes the skill manual-only. Preloaded subagent skills are different: their full content is injected at subagent startup. [S2][S8]

### 2.3 Frontmatter and Claude extensions

All fields are optional; `description` is recommended. Current documented fields include:

- Identity and triggering: `name`, `description`, `when_to_use`, `paths`.
- Arguments/UI: `argument-hint`, `arguments`; body substitutions include `$ARGUMENTS`, indexed/named arguments, `${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}`, `${CLAUDE_SKILL_DIR}`, and `${CLAUDE_PROJECT_DIR}`.
- Invocation control: `disable-model-invocation`, `user-invocable`.
- Runtime control: `allowed-tools`, `disallowed-tools`, `model`, `effort`, `hooks`, `shell`.
- Isolation: `context: fork` and optional `agent`, which run the skill body as a task in a fresh subagent context. [S2]

Skills may embed shell preprocessing with ``!`command` `` or a fenced shell block opened with three backticks followed by `!`; output is substituted before Claude sees the skill. Administrators can disable this for non-managed skills with `disableSkillShellExecution`. This is powerful but makes an otherwise portable Markdown skill dependent on Claude’s preprocessing and permission model. [S2]

Claude Code states that its skills follow the open Agent Skills standard, then adds features such as invocation controls, subagent execution, and dynamic context injection. Therefore the body, frontmatter basics, and supporting-file pattern are the best cross-agent payload; Claude-only fields should be treated as an adapter layer. [S2]

## 3. Plugins

### 3.1 What a plugin is

A plugin is a self-contained directory. The conventional layout is: [S3][S4]

```text
my-plugin/
├── .claude-plugin/
│   └── plugin.json        # optional manifest; only file placed here
├── skills/<name>/SKILL.md
├── commands/*.md          # legacy/flat skills
├── agents/*.md
├── hooks/hooks.json
├── .mcp.json
├── .lsp.json
├── output-styles/*.md
├── themes/*.json          # experimental component
├── monitors/monitors.json # experimental component
├── bin/                   # added to Bash PATH while enabled
├── settings.json          # currently only agent and subagentStatusLine supported
└── scripts/               # plugin-owned helpers
```

Components belong at the plugin root, not inside `.claude-plugin/`. A plugin-root `CLAUDE.md` is **not** loaded as project context; context must be shipped through a skill, agent, or hook. A plugin with exactly one skill may put `SKILL.md` at its root. [S3][S4]

### 3.2 Manifest

`.claude-plugin/plugin.json` is optional. Without it, Claude Code discovers default component locations and derives the plugin name from the directory. If a manifest exists, `name` (kebab-case, no spaces) is the only required field. The schema supports metadata (`displayName`, `version`, `description`, author, homepage, repository, license, keywords, `defaultEnabled`), custom component paths (`skills`, `commands`, `agents`, `hooks`, `mcpServers`, `outputStyles`, `lspServers`), `userConfig`, channels, dependencies, and experimental themes/monitors. [S4]

Custom `skills` paths add to the default `skills/` scan; several other custom path fields replace their default directories. Hooks, MCP, and LSP have their own merge rules. Unrecognized top-level manifest fields are ignored with validation warnings, so Anthropic notes that one JSON manifest can retain metadata from ecosystems such as VS Code or Cursor. That helps metadata co-location, but it does not make Claude plugin components executable elsewhere. [S4]

**Experimental:** Anthropic currently marks plugin themes and monitors as experimental and says their schemas may change. Do not make them a required cross-agent interchange primitive. [S4]

### 3.3 Namespacing, installation, and storage

Plugin skills and agents are scoped as `plugin-name:component-name`; for example, a plugin skill is invoked as `/my-plugin:review`. Namespacing prevents collisions with standalone skills. Plugin-bundled MCP tools also receive Claude-specific scoped callable names. [S3][S4][S7]

Plugin installation scopes are:

| Scope | Recorded in | Availability |
|---|---|---|
| User | `~/.claude/settings.json` | User across projects |
| Project | `.claude/settings.json` | Team via version control |
| Local | `.claude/settings.local.json` | User in one project |
| Managed | Managed settings | Organization controlled |

Installed marketplace plugins are copied into a versioned local cache at `~/.claude/plugins/cache`; they are not run from the marketplace checkout. Old versions are orphaned and removed after seven days. Installed plugins cannot rely on `../` paths outside the plugin root. Persistent plugin-owned data belongs under `${CLAUDE_PLUGIN_DATA}`, resolving to `~/.claude/plugins/data/<sanitized-plugin-id>/`, and normally survives upgrades until final uninstall. [S4]

A plugin can also be developed in place beneath a skills directory: any skill folder containing `.claude-plugin/plugin.json` loads on the next session as `<name>@skills-dir`, without marketplace installation or copying to cache. Project `@skills-dir` plugins require workspace trust and have tighter rules for executable components. [S3][S4]

### 3.4 Marketplaces

A distributable catalog lives at repository-root `.claude-plugin/marketplace.json`. It requires a marketplace `name`, an `owner`, and a `plugins` array; each plugin entry requires `name` and `source`. Sources can be relative paths, GitHub repositories, other Git URLs, git subdirectories, or npm packages. Users add the catalog and install `plugin-name@marketplace-name`; project-scope installation records the plugin in `.claude/settings.json`. [S5]

This catalog/installer layer is Claude-specific. For cross-agent portability, treat the plugin directory as a package of potentially portable assets (skills, scripts, MCP definitions), with a separate Claude packaging adapter.

## 4. Memory and persisted state

### 4.1 User-authored persistent instructions

`CLAUDE.md`, `CLAUDE.local.md`, and `.claude/rules/**/*.md` are the deterministic, user-maintained memory layer. They are plain Markdown, loaded every session (or lazily for path/nested rules), and are the most directly transferable form of project knowledge. They remain advisory context, not hard policy. [S1]

### 4.2 Main-agent auto memory

Auto memory is enabled by default. Claude decides what learnings are worth retaining and writes plain Markdown under:

```text
~/.claude/projects/<project>/memory/
├── MEMORY.md          # concise index/entrypoint
├── debugging.md       # optional topic file
├── api-conventions.md # optional topic file
└── ...
```

The project identity is derived from the git repository, so its worktrees and subdirectories share one memory directory; outside git, the project root is used. The location can be overridden with an absolute or `~/` path through `autoMemoryDirectory`. Auto memory is machine-local and not synchronized to other machines or cloud environments. [S1]

At conversation start, Claude Code loads the first 200 lines or 25 KB of `MEMORY.md`, whichever comes first. YAML frontmatter and block HTML comments are stripped before measuring/loading. Topic files are not preloaded; Claude reads them on demand. Claude Code encourages `MEMORY.md` to remain a compact index and moves detail to topic files. The files are editable/deletable Markdown and can be inspected via `/memory`. [S1]

Controls are `/memory`, `autoMemoryEnabled` in settings, or `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`. The main conversation’s auto memory is not automatically injected into ordinary non-fork subagents. [S1]

**Gap:** The documentation defines storage and loading behavior, but no stable cross-agent schema, merge protocol, synchronization format, provenance model, or official export/import command for auto memory. Plain Markdown makes content extractable, but another agent would need its own indexing, scoping, and conflict rules. [S1]

### 4.3 Persistent subagent memory

A custom subagent Markdown definition can set `memory: user`, `project`, or `local`. The directory becomes: [S8]

| Scope | Location | Shareability |
|---|---|---|
| `user` | `~/.claude/agent-memory/<agent-name>/` | Machine/user local across projects |
| `project` | `.claude/agent-memory/<agent-name>/` | Repository-specific and source-controllable |
| `local` | `.claude/agent-memory-local/<agent-name>/` | Repository-specific, not intended for version control |

When enabled, the subagent receives memory-management instructions plus the first 200 lines or 25 KB of its `MEMORY.md`; Read, Write, and Edit are automatically enabled for memory maintenance. `project` is Anthropic’s recommended default for shareable subagent knowledge. [S8]

### 4.4 Sessions are persistence, not a stable memory API

CLI conversations are continuously saved as plaintext JSONL at `~/.claude/projects/<project>/<session-id>.jsonl`; subagent transcripts live below the session directory. The default cleanup period is 30 days. A resumed session restores conversation history and some session state, but launch-only inputs such as `--plugin-dir`, `--settings`, and `--add-dir` must be supplied again. [S9][S10]

Anthropic explicitly states that each JSONL line may represent a message, tool use, or metadata entry and that the entry format is internal and may change between versions. Use `/export`, structured CLI output, hooks’ `transcript_path`, or the Agent SDK rather than parsing raw JSONL as an interchange contract. Transcripts/history are not encrypted at rest; OS permissions are the protection. [S9][S10]

## 5. Adjacent portability surfaces

### Settings

Settings are JSON at `~/.claude/settings.json` (user), `.claude/settings.json` (shared project), and `.claude/settings.local.json` (private project), with managed settings above them. Normal scalar precedence is managed > command line > local > project > user, though some collections such as permission rules merge under feature-specific rules. `~/.claude.json` separately stores app state, OAuth/UI preferences, user/local MCP definitions, project trust, and caches. [S6]

These paths and keys are Claude-specific, but project `settings.json` is a useful manifest from which a portability layer can extract enabled plugins, hooks, permissions intent, and environment setup.

### MCP

Team MCP servers live in project-root `.mcp.json` under an `mcpServers` object. Local and user MCP entries live in `~/.claude.json`; local entries are nested under the current project. Duplicate server-name precedence is local > project > user > plugin > claude.ai connector, and the winning entry replaces rather than field-merges. Project MCP servers require approval. [S7]

Because MCP is an open protocol and the project file is JSON, server definitions are good portability candidates. Adapt transport support, environment substitution, approval, credentials, and Claude’s plugin/tool namespacing rather than copying those assumptions blindly. [S7]

### Hooks

Hooks are lifecycle-triggered command, HTTP, MCP-tool, prompt, or agent handlers. They can be declared in settings, plugins, and skill/subagent frontmatter. Hook input/output is JSON and hooks are the documented mechanism for actions that must execute rather than merely guide the model. The event names, matcher rules, decision schema, and permission interactions are Claude-specific. [S4][S11]

### Custom subagents and commands

Custom subagents are Markdown files under `~/.claude/agents/`, `.claude/agents/`, or a plugin’s `agents/`, with YAML frontmatter for identity, description, model, tools, permissions, preloaded skills, MCP servers, hooks, memory, backgrounding, and worktree isolation. Their prompt bodies are portable in principle; the frontmatter contract and orchestration semantics require an adapter. [S8]

Flat `.claude/commands/*.md` remain supported but have been merged conceptually into skills. A new portability design should normalize them to a skill-like internal representation rather than treating commands as a separate enduring standard. [S2]

## 6. Portability notes and recommended extraction model

### Moves easily

1. **Project knowledge:** Markdown bodies from `CLAUDE.md`, imported documents, and `.claude/rules/**/*.md`.
2. **Skills:** `SKILL.md`, reference files, examples, templates, and scripts—especially fields shared with the Agent Skills standard.
3. **MCP server definitions:** transport, command/URL, arguments, and non-secret environment-variable names.
4. **Agent prompts:** Markdown bodies of `.claude/agents/*.md` after separating Claude-specific frontmatter.

### Moves with translation

1. **Lookup and precedence:** Claude’s upward `CLAUDE.md` walk, lazy nested loading, local-file ordering, rule globs, skill priority, and namespacing need to be represented explicitly in a neutral manifest.
2. **Skill runtime extensions:** invocation flags, tool grants/denials, shell preprocessing, substitutions, `context: fork`, hooks, models, and effort levels need capability mapping.
3. **Plugins:** preserve the plugin as a logical bundle, but generate Claude’s `.claude-plugin/plugin.json`, marketplace entry, names, and component paths from a neutral package description.
4. **Hooks and permissions:** translate intent and lifecycle events; do not assume another harness offers equivalent enforcement.
5. **Memory:** ingest Markdown content, but reimplement scope, indexing, freshness, provenance, and writeback rather than copying Claude’s directory as if it were a protocol.

### Should not be copied as a portable contract

1. Raw session/subagent JSONL schemas.
2. `~/.claude.json` wholesale, because it combines auth, UI state, trust, MCP configuration, and caches.
3. `~/.claude/plugins/cache`, which is versioned installation output rather than source.
4. Claude-specific plugin tool names and component namespaces.
5. Experimental themes/monitors schemas.

### Suggested neutral representation

A cross-agent system should keep source assets neutral and generate harness adapters:

```text
portable-agent-pack/
├── instructions/
│   ├── global.md
│   ├── project.md
│   └── rules/*.md
├── skills/<name>/SKILL.md
├── agents/<name>.md
├── integrations/mcp.json
├── automation/hooks.json
├── memory/
│   ├── MEMORY.md
│   └── topics/*.md
└── adapters/claude-code.json
```

The Claude adapter should encode where to materialize each asset, which Claude-only fields to add, and what should remain local. This avoids forcing Claude’s file paths or precedence rules onto every other agent while retaining its highly portable Markdown payloads.

## 7. Documented gaps and change-sensitive areas

- No official automatic loader is documented for arbitrary `DESIGN.md`/README files or `AGENTS.md`; bridge them through `CLAUDE.md` imports. [S1]
- No stable schema or cross-machine synchronization is documented for auto memory. [S1]
- Raw transcript JSONL is explicitly unstable. [S10]
- Plugin themes and monitors are explicitly experimental. [S4]
- Many behaviors are version-gated in current docs, including skill symlink support and several plugin/subagent refinements. Any migration tool should detect the installed Claude Code version and degrade conservatively. [S2][S4][S8]
- Cloud/Cowork sessions do not read a machine’s `~/.claude/skills/`; cloud sessions can load committed project skills or repo-declared plugins, while account-enabled skills are managed separately. Local-to-cloud portability therefore requires deliberate publication, not file copying alone. [S2]

## Sources

All sources are first-party Anthropic documentation, accessed **2026-07-18**.

| ID | Source | Direct URL | Used for |
|---|---|---|---|
| S1 | How Claude remembers your project | https://code.claude.com/docs/en/memory | `CLAUDE.md`, imports, `AGENTS.md`, lookup/order, rules, auto memory |
| S2 | Extend Claude with skills | https://code.claude.com/docs/en/skills | Skill format, discovery, priority, frontmatter, loading, commands compatibility |
| S3 | Create plugins | https://code.claude.com/docs/en/plugins | Plugin layout, development, namespaces, testing |
| S4 | Plugins reference | https://code.claude.com/docs/en/plugins-reference | Manifest schema, components, scopes, cache/data paths, experimental status |
| S5 | Create and distribute a plugin marketplace | https://code.claude.com/docs/en/plugin-marketplaces | Marketplace manifest, sources, install identifiers |
| S6 | Claude Code settings | https://code.claude.com/docs/en/settings | Settings files, scopes, precedence, plugin enablement |
| S7 | Connect Claude Code to tools via MCP | https://code.claude.com/docs/en/mcp | `.mcp.json`, MCP scopes/precedence, plugin MCP behavior |
| S8 | Create custom subagents | https://code.claude.com/docs/en/sub-agents | Agent definitions, skill preloading, persistent subagent memory |
| S9 | Explore the `.claude` directory | https://code.claude.com/docs/en/claude-directory | Configuration inventory, runtime-data paths, plaintext/retention |
| S10 | Manage sessions | https://code.claude.com/docs/en/sessions | Transcript location/format, resume semantics, JSONL stability warning |
| S11 | Hooks reference | https://code.claude.com/docs/en/hooks | Hook types, lifecycle, JSON I/O and enforcement role |
