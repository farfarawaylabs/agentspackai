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
- [Component selection and state design](./docs/agent-portability/agents-pack-component-selection-design.md)
- [Component-selection conformance — 2026-07-27](./docs/agent-portability/agents-pack-component-selection-conformance-2026-07-27.md)

## Development

```sh
bun install
bun run check
bun run cli --help
```

Seven lifecycle commands—`init`, `status`, `list`, `install`, `remove`,
`update`, and `eject`—work on top of the transactional lifecycle foundation.
Initialization supports explicit Recommended, All, or component-ID selection.
The selected IDs are stored as user intent, while the lockfile records exact
component and output hashes. Applied packs are cached immutably by digest so
later component operations do not need the original `--pack` path.

The first real core pack contains one required instruction component, 22
portable skills, and six native subagents. User-owned components, remote
content resolution, and public release packaging remain later increments.

```sh
bun run cli init \
  --scope repository \
  --agents claude,codex,cursor \
  --pack ./fixtures/packs/0.1.0 \
  --components recommended \
  --dry-run

bun run cli status

bun run cli list --available

bun run cli install agents-pack-smoke-test --dry-run

bun run cli remove agents-pack-smoke-test --dry-run

bun run cli update \
  --pack ./fixtures/packs/0.2.0 \
  --dry-run

bun run cli eject --dry-run
```
