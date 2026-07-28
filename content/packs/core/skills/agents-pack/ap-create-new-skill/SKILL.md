---
name: ap-create-new-skill
description: Create or update one user-owned, reusable skill and install it across every agent selected in the current Agents Pack scope. Use when the user explicitly asks to add, author, capture, or improve a skill, reusable agent workflow, project-specific procedure, or repeated prompt without leaving the coding-agent chat. Use Agents Pack rather than maintaining separate Claude, Codex, and Cursor copies.
---

# Create a New Skill

Create one canonical user-owned skill and let Agents Pack render its provider
copies. Never author `.claude/skills/`, `.agents/skills/`, or
`.cursor/skills/` independently.

## Define the skill before creating it

1. Read the repository instructions and relevant project context.
2. Identify two or three realistic user requests that should trigger the
   skill.
3. Choose a short verb-led lowercase hyphenated name. Do not use the reserved
   `ap-` prefix.
4. Write a single-line description that says:
   - what the skill does; and
   - the concrete requests, files, tools, or situations that should trigger it.
5. Decide which reusable resources are actually needed:
   - `scripts/` for deterministic or repeatedly rewritten operations;
   - `references/` for detailed material loaded only when relevant; and
   - `assets/` for templates or files copied into outputs.

Keep the skill narrow. If the requested behavior combines unrelated workflows,
recommend separate skills instead of creating a vague catch-all.

## Create the canonical source

Run:

```text
agents-pack create skill <name> --description "<description>" --yes
```

The command reports the canonical directory:

```text
Repository: .agents-pack/user/skills/<name>/
Global:     ~/.agents-pack/user/skills/<name>/
```

Edit only that canonical directory:

- keep `SKILL.md` as the required entrypoint;
- keep only `name` and `description` in its YAML frontmatter;
- write the body in imperative language;
- assume the coding agent is capable and include only non-obvious workflow,
  domain, tool, validation, or safety guidance;
- keep the main file concise and move conditional detail to directly linked
  resources;
- avoid README, changelog, installation-guide, and other process-history files;
  and
- test every bundled executable script with representative inputs.

Keep references one level below `SKILL.md`. When a long reference is needed,
tell the agent exactly when to read it rather than loading it unconditionally.

## Validate and install

1. Check that the frontmatter name matches the canonical directory.
2. Re-read the description against the example trigger requests. Tighten it if
   the skill would trigger too broadly or fail to trigger when requested.
3. Search for unfinished placeholders, stale paths, provider-specific
   assumptions, and duplicated instructions.
4. Run `agents-pack sync --dry-run` and inspect every planned provider output.
5. Run `agents-pack sync --yes`.
6. Run `agents-pack status` and require clean generated outputs.
7. Exercise the skill with at least one realistic request when practical.

If updating an existing user-owned skill, edit its canonical directory and
start at the validation step. If the requested starting point is an official
`ap-` skill, use `agents-pack fork <ap-name> --name <new-name>` first; never
edit the official component.

Report the canonical path, rendered targets, validation performed, and any
remaining limitation. Do not report success if synchronization or discovery
was not verified.
