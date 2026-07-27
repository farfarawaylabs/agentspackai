# Agents Pack component-selection conformance — 2026-07-27

## 1. Purpose

This run verifies the implemented component-selection lifecycle against the
real core pack and current Claude Code, Codex, and Cursor CLIs.

It covers:

- Recommended initialization;
- explicit configuration and component locking;
- discovery of the required instruction, a recommended skill, and a
  recommended subagent;
- installation and removal of an optional skill;
- clean status after each mutation; and
- All initialization of the complete core pack.

The repositories and lifecycle home were disposable. Provider CLIs used their
normal authenticated state only for fresh read-only discovery checks.

## 2. Environment

| Component | Tested version |
| --- | --- |
| macOS | 26.5.2, arm64 |
| Bun | 1.3.1 |
| Claude Code | 2.1.220 |
| Codex CLI | 0.145.0 |
| Cursor Agent CLI | 2026.07.23-e383d2b |
| Pack | `agents-pack-core@0.24.0` |

## 3. Recommended initialization

The repository was initialized with:

```sh
agents-pack init \
  --scope repository \
  --agents claude,codex,cursor \
  --pack /path/to/content/packs/core \
  --components recommended \
  --yes
```

The configuration stored 11 explicit IDs:

- required `ap-core-instructions`;
- nine recommended skills; and
- recommended `ap-code-reviewer`.

No optional component was selected. The lock recorded the same IDs, component
digests, the complete managed-output set, and the immutable pack digest. Status
reported every selected output as clean.

## 4. Real-agent discovery

Fresh read-only sessions checked selected content.

### 4.1 Required instruction and recommended skill

Each provider was asked to use `ap-debug` and return:

1. the repository-root files named by the core project-orientation
   instructions; and
2. the first section heading after the `ap-debug` title.

Claude Code, Codex, and Cursor all returned:

```text
PRD.md, TECHNICAL_REQUIREMENTS.md, TODOs.md
## Respect the requested scope
```

### 4.2 Recommended subagent

Each provider invoked or delegated to `ap-code-reviewer` and asked for the
first sentence below its title. All three returned:

```text
Review code like an owner.
```

Codex and Cursor needed access to their normal local authenticated state. Their
first sandbox-restricted attempts could not create or open provider state;
rerunning with normal local state passed. This was an execution-environment
restriction, not an adapter or discovery failure.

## 5. Optional install and remove

The optional security skill was installed without another pack path:

```sh
agents-pack install ap-security-audit --yes
```

This proved that the digest-matched shared Base contained unselected
components. Configuration and lock state added the explicit ID, all rendered
files were clean, and fresh Claude Code, Codex, and Cursor sessions discovered
the skill. All three identified its first section:

```text
## Operate safely
```

The component was then removed:

```sh
agents-pack remove ap-security-audit --yes
```

Configuration and lock state returned to the original Recommended selection.
The Claude and Codex skill copies, references, and empty component directories
were gone. Cursor had used the compatibility copies, so no separate native
Cursor copy remained. `list --available --kind skill` showed the component as
available again, and status reported every remaining output as clean.

## 6. All initialization

After ejection, the same repository was initialized with:

```sh
agents-pack init \
  --scope repository \
  --agents claude,codex,cursor \
  --pack /path/to/content/packs/core \
  --components all \
  --yes
```

The explicit configuration contained all 29 current components: one
instruction, 22 skills, and six subagents. Status reported the complete
provider output tree as clean.

## 7. Automated evidence

The automated suite covers:

- final schema-version-1 manifest, configuration, lock, and Base parsing;
- manifest metadata plus skill and subagent name consistency;
- Recommended, All, and explicit selection expansion;
- component and output hashing;
- update preservation of exact selection;
- newly required and missing selected component behavior;
- read-only list filtering;
- idempotent install and remove;
- required-component removal refusal;
- missing-Base warnings and failures;
- dry-run cache isolation;
- drift refusal;
- empty component-directory cleanup; and
- rollback after an injected component-installation failure.

## 8. Conclusion

The component-selection increment passes repository conformance for current
Claude Code, Codex, and Cursor versions. Recommended content is selected
explicitly, optional content can be installed and removed from the cached Base,
and All produces a clean complete output tree.

This does not approve remote distribution or a public release. Those remain
separate increments.
