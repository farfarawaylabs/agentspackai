# Agents Pack version-control conformance — 2026-07-27

## 1. Purpose

This run verifies the local-first release and version-control increment:

- pack-owned release notes;
- read-only `update --check`;
- version pinning and unpinning;
- rollback from the verified Base cache;
- preservation of user-owned canonical content; and
- transactional recovery during rollback.

Remote pack discovery, channels, published checksums, and signatures are not
part of this increment.

## 2. Environment

| Component | Tested version |
| --- | --- |
| macOS | 26.5.2, arm64 |
| Bun | 1.3.1 |
| Pack | `agents-pack-core@0.26.0` |

No provider adapter format changed. The existing Claude Code, Codex, and Cursor
discovery conformance therefore remains applicable; this run focuses on the
pack lifecycle and its provider-neutral management skill.

## 3. Release notes and update checking

Fixture packs `0.1.0` and `0.2.0` each declare and include their own
`RELEASE_NOTES.md`. An isolated repository initialized with `0.1.0` then ran:

```text
agents-pack update --check --pack <fixture-0.2.0>
```

The output reported:

- current `agents-pack-smoke@0.1.0`;
- candidate `agents-pack-smoke@0.2.0`;
- no active pin;
- `Update available`; and
- the `0.2.0` release notes.

Repository state and the user-level cache were byte-for-byte unchanged. The
same release notes were also shown by dry-run and applied update workflows.

## 4. Pin and unpin

`agents-pack pin` stored `pinned_version = "0.1.0"` in the installation
configuration. Status reported `Pin: 0.1.0`, update checking still reported the
new candidate, and applying `0.2.0` stopped with `PINNED`.

`agents-pack unpin` removed the constraint, after which the same forward update
completed. Repeated pin and unpin planning is idempotent.

## 5. Rollback

After updating from cached `0.1.0` to `0.2.0`, a rollback dry-run selected
`0.1.0`, displayed its release notes and complete plan, and wrote nothing.

Applied rollback:

- restored official outputs and lock state to `0.1.0`;
- set the installation pin to `0.1.0`;
- preserved a canonical user-owned skill byte-for-byte; and
- left generated user-component state separate.

An explicit uncached version and an installation with no older cached version
both stopped without writing.

## 6. Failure behavior

An injected failure after the first rollback operation exercised the real
transaction path. Agents Pack restored the repository byte-for-byte, retained
the `0.2.0` lock, and removed transaction artifacts.

Other verified protections include:

- forward `update` refusing semantic downgrades;
- rollback requiring an older semantic version;
- cached payload verification before selection;
- duplicate immutable version detection;
- managed-output drift checks; and
- pin/lock disagreement being classified as malformed state.

## 7. Automated evidence

The full repository gate passed:

- formatting;
- linting;
- TypeScript type checking;
- 188 tests;
- 745 assertions; and
- zero failures.

## 8. Conclusion

This report validated the local candidate lifecycle before remote distribution
was added. The later official registry resolver reuses the same check, pin,
unpin, rollback, cache, and transaction contracts; its separate evidence lives
with the distribution implementation.
