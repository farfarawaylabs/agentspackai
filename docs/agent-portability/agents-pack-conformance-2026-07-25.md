# Agents Pack real-agent conformance — 2026-07-24 to 2026-07-25

## 1. Purpose

This run checks whether the fixture content produced by Agents Pack is actually
discovered by current agent products. Filesystem tests prove that the CLI writes
the intended bytes; these tests prove that a fresh agent session can use them.

The test covers:

- repository-scoped Claude Code, Codex, and Cursor installations;
- global Claude Code and Codex installations;
- fixture pack `0.1.0`;
- an Agents Pack update to fixture pack `0.2.0`; and
- a fresh, non-persistent agent session for every instruction and skill check.

## 2. Test environment

| Component | Tested version |
| --- | --- |
| macOS | 26.5.2, arm64 |
| Bun | 1.3.1 |
| Claude Code | 2.1.219 |
| Codex CLI | 0.145.0 |
| Cursor Agent CLI | 2026.05.01-eea359f |

The repositories and isolated lifecycle homes were created below temporary
directories. The only deliberate user-level agent-configuration mutation was
the explicit global Claude/Codex test described in section 5. It was ejected
after the checks, and the pre-existing Codex `AGENTS.md` was verified
byte-for-byte afterward.

## 3. Expected markers

| Pack | Instruction marker | Skill marker |
| --- | --- | --- |
| `0.1.0` | `agents-pack-instruction-v1` | `agents-pack-skill-v1` |
| `0.2.0` | `agents-pack-instruction-v2` | `agents-pack-skill-v2` |

Instruction and skill checks were intentionally separate. A successful
instruction response therefore could not make a skill check pass by carrying
the marker forward in the same conversation.

## 4. Repository conformance

Three empty Git repositories were initialized. Each repository selected only
the agent under test.

### 4.1 Lifecycle commands

The v1 installation used:

```sh
HOME="$ISOLATED_HOME" bun /path/to/agents-pack/src/cli/main.ts init \
  --scope repository \
  --agents <claude|codex|cursor> \
  --pack /path/to/agents-pack/fixtures/packs/0.1.0 \
  --yes
```

The v2 update used:

```sh
HOME="$ISOLATED_HOME" bun /path/to/agents-pack/src/cli/main.ts update \
  --pack /path/to/agents-pack/fixtures/packs/0.2.0 \
  --yes
```

All three adapters installed and updated cleanly. The resulting locations were:

| Agent | Instruction | Skill |
| --- | --- | --- |
| Claude Code | `.claude/rules/agents-pack/smoke.md` | `.claude/skills/agents-pack-smoke-test/SKILL.md` |
| Codex | Managed block in root `AGENTS.md` | `.agents/skills/agents-pack-smoke-test/SKILL.md` |
| Cursor | `.cursor/rules/agents-pack/smoke.mdc` | `.cursor/skills/agents-pack-smoke-test/SKILL.md` |

### 4.2 Fresh-session invocations

Claude instruction checks used:

```sh
claude -p \
  --output-format text \
  --no-session-persistence \
  --permission-mode dontAsk \
  --setting-sources project \
  "Without editing files, answer only with the exact version token from the Agents Pack smoke-test instruction that applies to this repository."
```

Claude skill checks used a new process:

```sh
claude -p \
  --output-format text \
  --no-session-persistence \
  --permission-mode dontAsk \
  --setting-sources project \
  "/agents-pack-smoke-test"
```

Codex instruction checks used:

```sh
codex exec \
  --ephemeral \
  --sandbox read-only \
  --ignore-user-config \
  -C "$REPOSITORY" \
  "Without editing files, answer only with the exact version token from the Agents Pack smoke-test instruction that applies to this repository."
```

Codex skill checks used a new process:

```sh
codex exec \
  --ephemeral \
  --sandbox read-only \
  --ignore-user-config \
  -C "$REPOSITORY" \
  'Use $agents-pack-smoke-test and answer only with the exact version token the skill instructs you to return.'
```

Cursor instruction checks used:

```sh
cursor-agent -p \
  --output-format text \
  --mode ask \
  --trust \
  --workspace "$REPOSITORY" \
  "Without editing files, answer only with the exact version token from the Agents Pack smoke-test instruction that applies to this repository."
```

### 4.3 Results

| Agent | v1 instruction | v1 skill | v2 instruction | v2 skill |
| --- | --- | --- | --- | --- |
| Claude Code | Pass | Pass | Pass | Pass |
| Codex | Pass | Pass | Pass | Pass |
| Cursor | Pass | Pass | Pass | Pass |

All three agents returned the exact expected markers in every check. None
returned a v1 marker after the v2 update.

Cursor skill checks used a separate process and selected the skill by name:

```sh
cursor-agent -p \
  --output-format text \
  --mode ask \
  --trust \
  --workspace "$REPOSITORY" \
  "Use the agents-pack-smoke-test skill and answer only with the exact version token that the skill instructs you to return."
```

The first run on 2026-07-24 was blocked because Cursor Agent was not
authenticated. After authentication, the complete Cursor sequence was rerun
from a new empty repository on 2026-07-25. Both `.cursor/rules` and
`.cursor/skills` were discovered in fresh headless sessions at v1 and v2.

## 5. Global Claude and Codex conformance

An isolated `HOME` could not be used for this portion because it also isolated
the products from their authenticated state. Before installing globally, the
test confirmed:

- no Agents Pack global lifecycle state existed;
- no smoke-test Claude rule or skill existed;
- no smoke-test Codex skill existed; and
- the existing `~/.codex/AGENTS.md` was empty.

The original Codex file was copied with its permissions and hashed before the
test.

Agents Pack then installed both global adapters into the real user home:

```sh
bun /path/to/agents-pack/src/cli/main.ts init \
  --scope global \
  --agents claude,codex \
  --pack /path/to/agents-pack/fixtures/packs/0.1.0 \
  --yes
```

Claude checks used fresh print-mode processes with
`--setting-sources user`. Codex checks used the same `codex exec --ephemeral`
shape as the repository checks, but ran in a repository with no project
Agents Pack content.

| Agent | v1 instruction | v1 skill | v2 instruction | v2 skill |
| --- | --- | --- | --- | --- |
| Claude Code | Pass | Pass | Pass | Pass |
| Codex | Pass | Pass | Pass | Pass |

The installation was then removed with:

```sh
bun /path/to/agents-pack/src/cli/main.ts eject --yes
```

Cleanup verification passed:

- the restored `~/.codex/AGENTS.md` matched the backup byte-for-byte;
- its SHA-256 returned to
  `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`;
- `~/.agents-pack` was absent; and
- all four temporary global smoke-test files were absent.

## 6. Observed product differences

- Claude skills are naturally invoked as slash commands:
  `/agents-pack-smoke-test`.
- Codex skills are naturally invoked by name with a dollar prefix:
  `$agents-pack-smoke-test`.
- Claude provides separate project and user setting-source controls, which made
  the repository and global tests easy to isolate after authentication was
  available.
- Codex's `--ephemeral` mode created a fresh non-persistent session while still
  discovering both root/global `AGENTS.md` instructions and standard skill
  roots. `--ignore-user-config` did not prevent the temporary global
  `AGENTS.md` or global skill from being discovered in this version.
- Codex printed state-database discrepancy warnings during several invocations.
  They did not change the response or exit status.
- Cursor discovered the native `.cursor/rules` instruction automatically.
  Asking it to use `agents-pack-smoke-test` by name selected the native
  `.cursor/skills` package.
- Cursor's headless CLI must be authenticated before its installed files can be
  tested. Generated files alone are not enough to claim product conformance.
- Cursor's all-target compatibility-root and same-name collision behavior was
  not exercised. The MVP still avoids writing a third copy of a Cursor skill
  when a selected Claude or Codex compatibility copy already exists.

## 7. Conclusion

Repository conformance is verified for Claude Code 2.1.219, Codex CLI 0.145.0,
and Cursor Agent CLI 2026.05.01-eea359f across both fixture versions. Global
conformance is also verified for Claude Code and Codex. The update mechanism
was visible immediately in new sessions, with no stale v1 behavior.

No adapter change or automated regression test was required from this run.

Phase 8 is complete. The multi-root Cursor collision experiment remains a
separately recorded compatibility question; it does not need to expand the
lifecycle MVP.
