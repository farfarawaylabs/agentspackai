# Agents Pack core-content conformance — 2026-07-27

## 1. Purpose

This run verifies that the first real `agents-pack-core` content pack is not
only rendered correctly but is discovered and used by current Claude Code,
Codex, and Cursor repository sessions.

The earlier lifecycle conformance run used deliberately fake marker content.
This follow-up uses real instructions, a real portable skill, and a real native
subagent from pack version `0.24.0`.

## 2. Pack under test

The pack contains:

- one always-on core instruction component;
- 22 portable skills, including command-style workflows and their references;
- six subagents with provider-neutral instructions and execution profiles; and
- native rendering for Claude Code, Codex, and Cursor.

Each provider received the complete pack in its own disposable empty Git
repository. After the semantic checks, `agents-pack status` reported every
managed file and block as clean in all three repositories.

## 3. Environment

| Component | Tested version |
| --- | --- |
| macOS | 26.5.2, arm64 |
| Bun | 1.3.1 |
| Claude Code | 2.1.220 |
| Codex CLI | 0.145.0 |
| Cursor Agent CLI | 2026.07.23-e383d2b |
| Pack | `agents-pack-core@0.24.0` |

## 4. Checks

Every check used a fresh non-interactive process and requested an exact phrase
from installed content.

### 4.1 Always-on instruction

The agent was asked for the repository-root files that project instructions say
to check before planning, changing code, or brainstorming.

Expected:

```text
PRD.md, TECHNICAL_REQUIREMENTS.md, TODOs.md
```

Claude Code, Codex, and Cursor all returned the expected filenames.

### 4.2 Portable skill

The agent was asked to use `ap-debug` and return the first section heading after
the skill title.

Expected:

```text
## Respect the requested scope
```

Claude invoked `/ap-debug`, Codex invoked `$ap-debug`, and Cursor selected
`ap-debug` by name. All three returned the expected heading.

### 4.3 Native subagent

The `ap-code-reviewer` subagent was asked to return the first sentence below its
title without reviewing the repository.

Expected:

```text
Review code like an owner.
```

| Provider | Invocation evidence | Result |
| --- | --- | --- |
| Claude Code | Direct project agent selection with `--agent ap-code-reviewer` | Pass |
| Codex | Main session delegated to the generated project subagent | Pass |
| Cursor | Stream output identified custom subagent `ap-code-reviewer` and returned its result | Pass |

Codex could not spawn a subagent from `codex exec --ephemeral`: the host
reported that the parent thread did not exist. The same generated subagent
passed in a normal fresh `codex exec` session. This is recorded as an
ephemeral-session host limitation, not an adapter or content failure.

## 5. Automated evidence

`bun run check` validates:

- formatting and linting;
- TypeScript type safety;
- pack schema and subagent-profile validation;
- deterministic provider rendering;
- byte-identical portable skill payloads;
- native provider subagent metadata;
- transactional install, status, update, recovery, and eject behavior; and
- absence of duplicate legacy Claude command files.

At this milestone the suite passes 153 tests across 14 files.

## 6. Scope and limitations

This run proves representative discovery and execution, not the quality of
every possible model response from all 22 skills. Automated tests cover every
rendered output; sampling one instruction, one portable skill, and one native
subagent avoids pretending that nondeterministic end-to-end model evaluations
are exhaustive.

The run covered repository scope. The earlier lifecycle conformance record
already covers global instruction and skill discovery for Claude Code and
Codex. Global native subagents and the future component-selection workflow
remain separate follow-up work.

## 7. Conclusion

The real core content pack is accepted for the next internal product increment.
Its instructions, portable skills, and native subagents are discoverable in
current versions of all three supported repository agents.

This does not approve a public release. The CLI still requires a local pack
path, installs the complete pack, and lacks user-owned component lifecycle,
remote immutable resolution, and release packaging.
