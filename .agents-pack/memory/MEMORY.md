# Project memory

High-value orientation for the Agents Pack CLI and core content pack.

## Dev flow

- [ap-dev-flow-auto's authority](shared/2026-09-22-dev-flow-auto-authority.md) —
  naming the skill authorizes a push and a draft PR, and nothing else.
- [Auto mode and a changed plan hash](shared/2026-09-22-dev-flow-auto-plan-hash.md) —
  it always continues; the risk was raised and accepted.
- [ap-review-plan's directory](shared/2026-09-22-review-plan-lives-outside-dev-flow-dir.md) —
  its category is dev-flow but its files are not, so directory sweeps miss it.

## Releases

- [Pack version bump touchpoints](shared/2026-09-22-pack-version-bump-touchpoints.md) —
  two test files pin versions, one of them pins the *next* version.
- [CLI release touchpoints](shared/2026-10-01-cli-release-touchpoints.md) —
  four files here, three in the web repo, and a manual docs deploy.
- [SDD removal sequencing](shared/2026-09-22-sdd-removal-sequencing.md) —
  deferred to pack 0.34.0.
- [macOS binary signatures](shared/2026-10-01-bun-macos-signatures.md) —
  Bun's compile output is invalidly signed; release must re-sign and
  `codesign --verify --strict`.
