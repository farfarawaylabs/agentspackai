# Agents Pack user-owned components

**Status:** Implemented  
**Last updated:** 2026-07-27  
**Scope:** Creating, editing, forking, synchronizing, and preserving portable
user-owned skills and subagents

## 1. The simple model

Agents Pack now manages two kinds of content:

| Content | Owner | Updated by |
|---|---|---|
| Official `ap-` components | Agents Pack | `install`, `remove`, and `update` |
| User-owned components | The user or repository | Editing one canonical source and running `sync` |

Generated Claude, Codex, and Cursor files are never the editable source. A user
changes one canonical component, then Agents Pack regenerates every selected
provider copy.

## 2. Filesystem structure

Repository scope stores canonical user content here:

```text
.agents-pack/
├── pack.toml                  # Official selection
├── lock.json                  # Official generated-output lock
├── user-lock.json             # User generated-output lock
└── user/
    ├── pack.toml              # Local user-component catalog
    ├── skills/
    │   └── deploy-app/
    │       ├── SKILL.md
    │       ├── agents/
    │       │   └── openai.yaml
    │       ├── references/
    │       ├── scripts/
    │       └── assets/
    └── subagents/
        └── release-checker/
            ├── agent.toml
            └── instructions.md
```

Global scope uses the same tree under `~/.agents-pack/`.

The local user `pack.toml` is a self-contained catalog of canonical components.
It uses the existing pack loader and validation rules, but its identity is
always `agents-pack-user@local`. User names cannot use the official `ap-`
prefix.

## 3. Why user state is separate

Official and user content have different ownership rules:

- official source is immutable Base content and may be replaced by an update;
- user source is editable and must never be overwritten by an official update;
- official generated files are recorded in `lock.json`; and
- user generated files are recorded independently in `user-lock.json`.

This separation lets Agents Pack detect edits to generated copies without
treating intentional edits to canonical user source as corruption.

When canonical source differs from the last synchronized version, `status`
reports:

```text
User-owned canonical sources changed; run agents-pack sync.
```

## 4. Create a skill

Run:

```text
agents-pack create skill deploy-app \
  --description "Deploy this application safely. Use for staging or production deployment." \
  --yes
```

The command:

1. validates the name and description;
2. creates `.agents-pack/user/skills/deploy-app/`;
3. writes a valid `SKILL.md` scaffold and Codex UI metadata;
4. adds the component to the local user manifest;
5. renders provider copies for the selected agents;
6. writes `user-lock.json`; and
7. commits all changes atomically or restores the previous filesystem.

The scaffold is intentionally small. The user or active coding agent edits the
canonical source and then runs:

```text
agents-pack sync --dry-run
agents-pack sync --yes
agents-pack status
```

`ap-create-new-skill` provides this complete workflow inside a coding-agent
conversation.

## 5. Create a subagent

Run:

```text
agents-pack create subagent release-checker \
  --description "Review release correctness and operational risk. Use before deployment." \
  --yes
```

New subagents default to read-only. Add `--write` only when the role must modify
the workspace:

```text
agents-pack create subagent api-implementer \
  --description "Implement approved API changes. Use after an API plan is accepted." \
  --write \
  --yes
```

The canonical source contains provider-neutral `agent.toml` and
`instructions.md`. Adapters render native Claude, Codex, and Cursor definitions.

## 6. Fork an official component

Run:

```text
agents-pack fork ap-debug --name my-debug --yes
```

Forking:

1. loads the exact installed Base pack;
2. copies the official skill or subagent source;
3. changes its canonical identity to the new user name;
4. records it in the user manifest;
5. renders it for every selected agent; and
6. leaves the original official component installed and update-owned.

The user-owned copy is independent and is never overwritten by official
updates. If the original is optional and is no longer wanted, remove it
separately after forking:

```text
agents-pack remove ap-debug --yes
```

Instructions cannot be forked as components. Repository-specific instruction
customization belongs in user-owned instruction files outside Agents Pack's
managed block.

## 7. Synchronization

`agents-pack sync` loads the current canonical user pack and reconciles the
complete desired user output tree.

- Canonical source changes are expected.
- Direct edits, deletions, or malformed provider copies are drift and block the
  operation.
- A dry run shows every generated change.
- A repeated synchronization is a no-op.
- Official and user output paths may not collide.
- Every mutation uses the same operation lock, transaction journal, rollback,
  and post-write validation as official content.

## 8. Listing, status, and eject

`agents-pack list --installed` includes user-owned components with a
`user-owned` label.

`agents-pack status` shows official and user component names together and
checks both generated-output locks.

`agents-pack eject` removes official and user-generated provider copies and
both locks. It deliberately preserves `.agents-pack/user/` so a later
installation can synchronize the user's canonical content again.

## 9. Always-installed management skills

The core pack includes two required skills, introduced in `0.25.0`:

- `ap-manage-agents-pack` chooses and safely runs lifecycle commands; and
- `ap-create-new-skill` authors or updates one canonical portable skill from
  inside a coding-agent conversation.

Required means initialization always includes them, even when the user supplies
an explicit component list, and they cannot be removed independently.

## 10. Deliberate limits

This increment does not add:

- deletion or renaming of user-owned components;
- remote user-component sharing;
- third-party publishers;
- executable-component permission declarations;
- automatic three-way merging of canonical sources;
- a desktop editor.

Those features should build on the separate source and lock model rather than
changing provider copies directly.
