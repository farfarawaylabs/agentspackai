# Agents Pack distribution conformance — 2026-07-27

**Status:** Local implementation verified; first live GitHub release pending
**Pack:** `agents-pack-core@0.26.0`

This report records the evidence for official registry resolution, pack
artifact construction, and the tag-triggered release workflow.

## 1. Automated behavior

The tests cover:

- deterministic official artifact serialization and round-trip loading;
- rejection of an artifact whose declared whole-pack digest is wrong;
- registry schema, semantic-version, latest-pointer, and HTTPS validation;
- matching registry, artifact ID, version, and official source;
- `init` without `--pack` through a local HTTP registry;
- `update --check` discovering a newer official artifact without writing it;
- `update --yes` downloading, caching, and applying that artifact;
- persistence of `source = "official"` in installation state; and
- refusal to use the official registry for an installation initialized from a
  local pack.

The full repository gate passed:

- formatting;
- linting;
- TypeScript type checking;
- 194 tests;
- 767 assertions; and
- zero failures.

## 2. Maintainer artifact

This command completed successfully:

```text
bun run pack:build \
  --registry registry/v1/index.json \
  --tag pack-core-v0.26.0
```

It produced a roughly 498 KB official artifact containing 67 canonical files.
The artifact loaded back as `agents-pack-core@0.26.0`, retained the `official`
source marker, and passed all per-file, manifest, component-source, identity,
and whole-pack digest validation.

The workflow YAML also parsed successfully. Its jobs enforce release-before-
registry ordering, and the build step rejects disagreement between the Git tag,
pack manifest, registry latest pointer, and release-asset URL.

## 3. Live verification still required

This work does not claim that a public pack is already downloadable. After the
implementation is merged:

1. enable GitHub Pages with GitHub Actions as its source;
2. enable immutable GitHub releases;
3. push `pack-core-v0.26.0` on the intended merge commit;
4. verify the workflow publishes the `.pack` release asset;
5. verify the Pages registry returns `0.26.0`; and
6. run a clean CLI initialization against the live registry.

Those steps change external GitHub state and are deliberately separate from
the local implementation evidence in this report.

A read-only GitHub check confirmed that `farfarawaylabs/agentspackai` is public
and uses `main` as its default branch. The repository's Pages API returned
`404 Not Found`, confirming that GitHub Pages had not yet been configured at
the time of this report. Immutable-release configuration was not changed or
claimed as verified.
