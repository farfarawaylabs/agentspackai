# Agents Pack

Agents Pack is an experimental CLI for installing and safely updating shared coding-agent instructions and skills across Claude Code, Codex, and Cursor.

The repository contains the completed internal lifecycle MVP described in:

- [Lifecycle MVP](./docs/agent-portability/agents-pack-lifecycle-mvp.md)
- [MVP development plan](./docs/agent-portability/agents-pack-mvp-development-plan.md)
- [Real-agent conformance — 2026-07-24 to 2026-07-25](./docs/agent-portability/agents-pack-conformance-2026-07-25.md)
- [Lifecycle MVP review](./docs/agent-portability/agents-pack-mvp-review.md)

## Development

```sh
bun install
bun run check
bun run cli --help
```

All four lifecycle commands—`init`, `status`, `update`, and `eject`—work on top of the transactional lifecycle foundation. Claude Code, Codex, and Cursor passed repository v1-to-v2 conformance; Claude Code and Codex also passed global conformance. The MVP review approves the architecture for the next internal content increment, but not yet for public distribution.

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
