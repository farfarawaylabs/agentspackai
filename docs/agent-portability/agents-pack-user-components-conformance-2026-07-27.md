# Agents Pack user-component conformance — 2026-07-27

## 1. Purpose

This run verifies the first user-owned component lifecycle and its two required
management skills:

- `agents-pack create skill`;
- `agents-pack create subagent`;
- `agents-pack fork`;
- `agents-pack sync`;
- separate canonical user state and generated-output state;
- safe status, list, drift, rollback, and eject behavior;
- `ap-manage-agents-pack`; and
- `ap-create-new-skill`.

All repositories and homes used for the run were disposable. Provider CLIs used
their normal authenticated state only for fresh read-only discovery checks.

## 2. Environment

| Component | Tested version |
| --- | --- |
| macOS | 26.5.2, arm64 |
| Bun | 1.3.1 |
| Claude Code | 2.1.220 |
| Codex CLI | 0.145.0 |
| Cursor Agent CLI | 2026.07.23-e383d2b |
| Pack | `agents-pack-core@0.25.0` |

## 3. Required core skills

Initialization explicitly selected only `ap-core-instructions`. Agents Pack
also installed `ap-manage-agents-pack` and `ap-create-new-skill` because both
are required components. Claude and Codex received native skill copies. Cursor
discovered the same skills through its Claude and Codex compatibility roots.

Fresh read-only Claude Code, Codex, and Cursor sessions were asked to use
`ap-create-new-skill` and report its exact canonical skill locations. All three
returned:

```text
Repository: .agents-pack/user/skills/<name>/
Global: ~/.agents-pack/user/skills/<name>/
```

The first discovery run exposed wording that named only the shared user root.
The skill was corrected to state the full kind-specific path, the test
repository was recreated from the corrected pack, and all three providers then
returned the exact paths above.

## 4. Forward test: create a skill from a chat

An isolated agent was given the installed `ap-create-new-skill` skill and asked
to create `explain-ci-failures`. It:

1. previewed `agents-pack create skill`;
2. created the scaffold;
3. edited only
   `.agents-pack/user/skills/explain-ci-failures/SKILL.md`;
4. previewed and applied `agents-pack sync`;
5. confirmed that a repeated sync produced no changes; and
6. confirmed clean status and provider-identical rendered files.

The resulting skill requires complete CI evidence, competing hypotheses, a
small evidence-backed fix, explicit verification, and a plain-language report.
It remains read-only unless the user separately asks for implementation or
remote workflow actions.

Fresh Claude Code, Codex, and Cursor sessions all discovered both the
user-created skill and the required creation skill. Each returned the requested
investigation principle and canonical-source guidance.

## 5. Forward test: create a subagent from a chat

A second isolated agent used `ap-manage-agents-pack` to create the read-only
`release-notes-researcher` subagent. The canonical source contains
`agent.toml` and `instructions.md`. Provider rendering produced:

- Claude permission mode `plan`;
- Codex sandbox mode `read-only`; and
- Cursor `readonly: true`.

The agent previewed creation and synchronization, applied both operations, and
finished with clean status. The resulting role researches official release
notes, records dates and citations, and separates confirmed compatibility
findings from uncertainty.

## 6. Automated evidence

The repository suite passed 173 tests with 668 assertions. Coverage includes:

- create, edit, sync, list, status, and idempotent sync for a user skill;
- source-change warnings without treating intentional source edits as output
  drift;
- safe read-only subagent defaults and explicit write opt-in;
- official skill forking with rewritten identity;
- reserved `ap-` name refusal;
- collision protection across official and user-owned outputs;
- separate `.agents-pack/user-lock.json` state;
- byte-for-byte rollback after interrupted creation;
- refusal to remove canonical user source through a transaction;
- eject removing rendered copies while preserving canonical user content; and
- required management skills rendering even when initialization explicitly
  selects only the core instruction.

The bundled skill validator could not run because its Python environment lacked
PyYAML. Equivalent YAML/frontmatter validation passed with Ruby, pack loading
reported 31 valid components, and the full format, lint, typecheck, and test
suite passed.

## 7. Current boundaries

This increment intentionally does not add:

- deletion or renaming of user-owned components;
- automatic import of pre-existing provider-specific components;
- three-way merging of user source;
- remote publication or sharing of user components; or
- a graphical editor.

Canonical user content remains user-owned. Agents Pack regenerates and protects
only the provider copies and its separate synchronization state.

## 8. Conclusion

The user-owned component lifecycle passes automated, forward-use, and current
provider-discovery checks. A user can now create or fork one canonical skill or
subagent, edit it once, and safely regenerate the selected Claude, Codex, and
Cursor representations. The two required core skills make the same lifecycle
available from an ordinary coding-agent chat.
