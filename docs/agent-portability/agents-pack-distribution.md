# Agents Pack content distribution

**Status:** Implemented
**Last updated:** 2026-07-27

This document explains where the official content pack comes from, how the CLI
finds it, and how maintainers publish a new version.

## 1. Release unit

The complete core pack is one release unit. Skills and subagents have stable
component IDs, but they are not independently versioned.

Changing three skills and adding one skill therefore produces one new core-pack
version. This avoids a dependency graph between instructions, skills,
subagents, and adapters. An installation still applies only its selected
component IDs.

Use:

- a patch version for compatible corrections and clarifications;
- a minor version for new components and other compatible capabilities; and
- a major version for removals, renames, or incompatible lifecycle behavior.

## 2. Distribution architecture

The source remains under `content/packs/core/`. A release produces three
distinct objects:

1. a Git tag such as `pack-core-v0.27.0`;
2. an immutable GitHub Release asset such as
   `agents-pack-core-0.27.0.pack`; and
3. a small static registry document that identifies the current official
   version and its asset URL.

The source registry is `registry/v1/index.json`. GitHub Pages publishes it at:

```text
https://farfarawaylabs.github.io/agentspackai/registry/v1/index.json
```

The CLI does not scan Git tags or guess which GitHub Release is the content
release. It fetches this explicit registry.

## 3. User flow

Without `--pack`, initialization resolves `agents-pack-core` from the official
registry:

```text
agents-pack init \
  --scope repository \
  --agents claude,codex,cursor \
  --components recommended \
  --yes
```

An official installation records `source = "official"`. It can later run:

```text
agents-pack update --check
agents-pack update --yes
```

The first command downloads and validates the latest artifact without caching
or writing it. The second downloads it, shows the release and operation plan,
caches the exact pack by content digest, and applies selected components
transactionally.

`--pack <path>` remains an explicit local override for development, testing,
air-gapped use, and private packs. An installation initialized from a local
pack records `source = "local"` and requires another explicit `--pack` for
updates.

For local registry testing, `AGENTS_PACK_REGISTRY_URL` overrides the compiled
official registry URL.

## 4. Pack artifact

Run:

```text
bun run pack:build
```

The command validates the canonical pack and writes:

```text
dist/packs/agents-pack-core-<version>.pack
```

The artifact is deterministic JSON containing:

- pack ID, semantic version, source kind, and whole-pack digest;
- every canonical relative file path;
- every file digest; and
- exact file bytes encoded as base64.

Loading an artifact verifies every file digest, reconstructs the manifest,
validates all component sources, and confirms that the reconstructed pack
identity and digest match the envelope.

These internal hashes detect corruption and inconsistent artifacts. Published
checksums, attestations, or signature enforcement can be added separately.

## 5. Publishing a core-pack version

Make the content change in a normal pull request:

1. edit existing canonical component files;
2. add any new component directory and its `pack.toml` entry;
3. update the version in `content/packs/core/pack.toml`;
4. replace `content/packs/core/RELEASE_NOTES.md` with notes for that exact
   version; and
5. add the version and final release-asset URL to
   `registry/v1/index.json`, then move `latest` to it.

Before merging, build the exact proposed release locally:

```text
bun run check
bun run pack:build \
  --registry registry/v1/index.json \
  --tag pack-core-v0.27.0
```

After the pull request is merged, tag the merge commit:

```text
git switch main
git pull --ff-only
git tag pack-core-v0.27.0
git push origin pack-core-v0.27.0
```

The tag-triggered workflow:

1. checks out the tagged commit;
2. installs locked dependencies and runs the complete repository check;
3. verifies the tag, manifest version, registry version, and asset URL agree;
4. builds the official `.pack` artifact;
5. creates a draft GitHub Release and attaches the artifact;
6. publishes the release; and only then
7. deploys the tagged registry through GitHub Pages.

Advancing the registry last prevents users from seeing a version whose asset
is not available. Release and registry publishing are separate jobs, so a
failed Pages deployment can be retried without recreating a successful
release.

## 6. One-time repository setup

Before the first public content release:

1. configure GitHub Pages to deploy through GitHub Actions;
2. enable immutable releases for the repository or organization;
3. confirm the Actions workflow may write repository contents and Pages; and
4. publish and test the first tag before distributing the CLI broadly.

The registry is deliberately static. No Agents Pack server, database, user
account, or GitHub API request is needed during ordinary installation and
update checks.
