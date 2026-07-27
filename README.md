# Agents Pack

Agents Pack is an experimental CLI for installing and safely updating shared
coding-agent instructions, skills, and subagents across Claude Code, Codex, and
Cursor.

The repository contains:

- [Lifecycle MVP](./docs/agent-portability/agents-pack-lifecycle-mvp.md)
- [MVP development plan](./docs/agent-portability/agents-pack-mvp-development-plan.md)
- [Real-agent conformance — 2026-07-24 to 2026-07-25](./docs/agent-portability/agents-pack-conformance-2026-07-25.md)
- [Lifecycle MVP review](./docs/agent-portability/agents-pack-mvp-review.md)
- [Core content catalog](./content/README.md)
- [Core content conformance — 2026-07-27](./docs/agent-portability/agents-pack-core-content-conformance-2026-07-27.md)

## Development

```sh
bun install
bun run check
bun run cli --help
```

All four lifecycle commands—`init`, `status`, `update`, and `eject`—work on top
of the transactional lifecycle foundation. The first real core pack contains
one always-on instruction component, 22 portable skills, and six native
subagents. Claude Code, Codex, and Cursor passed repository discovery checks
for the core instruction, a representative skill, and a representative
subagent.

The CLI remains an internal prototype. It currently installs a complete local
pack supplied with `--pack`; component selection, user-owned components, remote
content resolution, and public release packaging are the next product
increments.

```sh
bun run cli init \
  --scope repository \
  --agents claude,codex,cursor \
  --pack ./fixtures/packs/0.1.0 \
  --dry-run

bun run cli status

bun run cli update \
  --pack ./fixtures/packs/0.2.0 \
  --dry-run

bun run cli eject --dry-run
```
