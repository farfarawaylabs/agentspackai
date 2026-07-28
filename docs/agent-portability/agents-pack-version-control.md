# Agents Pack release notes, pinning, and rollback

**Status:** Implemented
**Last updated:** 2026-07-27

This document explains how Agents Pack checks a proposed content update, keeps
an installation on one version, and restores an older cached version.

## 1. Official and local pack sources

An installation without `--pack` obtains `agents-pack-core` from the official
static registry and records `source = "official"`:

```text
agents-pack update --check
```

`--pack` is the explicit override for local development, private packs, and
offline use:

```text
agents-pack update --check --pack /path/to/pack
```

An installation initialized with `--pack` records `source = "local"` and
requires an explicit local candidate for later updates. This prevents a private
pack from silently switching to the public registry.

## 2. Release notes belong to the pack

An official pack manifest may declare:

```toml
version = "0.26.0"
release_notes = "RELEASE_NOTES.md"
```

The referenced file is part of the pack payload and its content hash. It
describes that exact version, rather than acting as an ever-growing changelog.
The same notes remain available when the pack is loaded from the local Base
cache.

## 3. Check an update without changing anything

Run:

```text
agents-pack update --check
```

The command prints:

- the installed version;
- the candidate version;
- the current pin, if any;
- whether the candidate is newer, current, or older; and
- the candidate release notes.

The registry and candidate artifact are fully downloaded and validated. For a
current or newer version, Agents Pack also verifies that the selected
components can be rendered and that existing managed outputs are clean. The
command does not cache the candidate or write installation state.

Pass `--pack /path/to/candidate` to check a local candidate instead.

`--check` cannot be combined with `--yes` or `--dry-run`. Use `--dry-run` when
the exact filesystem operation plan is needed.

## 4. Pin and unpin

Run:

```text
agents-pack pin
```

This writes the currently installed pack version into the installation
configuration:

```toml
[pack]
id = "agents-pack-core"
source = "official"
pinned_version = "0.26.0"
```

A pin means “do not move this installation to a different official pack
version.” Component install and remove operations within the installed pack
still work. An update check can still report a newer candidate and its release
notes, but applying that update stops with a `PINNED` error.

Run:

```text
agents-pack unpin
```

to remove the constraint and allow a forward update. Both commands are
idempotent, transaction-protected, and reported by `agents-pack status`.

## 5. Roll back

Every successfully initialized or applied pack is stored in the user-level
content-addressed Base cache. To restore the newest cached version older than
the installed one:

```text
agents-pack rollback --dry-run
agents-pack rollback --yes
```

To choose an exact cached version:

```text
agents-pack rollback 0.24.0 --yes
```

Rollback:

1. considers only cached packs with the same pack ID;
2. requires a version older than the installed version;
3. verifies the cached payload before using it;
4. shows the target release notes and complete change plan;
5. restores official outputs transactionally;
6. preserves canonical user-owned skills and subagents;
7. removes selected official components that did not exist in the target
   version and reports each one; and
8. pins the restored version after success.

Pinning after rollback prevents a later update from immediately undoing the
user's decision. The user can explicitly run `agents-pack unpin` when ready.

## 6. Failure and safety behavior

- Managed-output drift blocks pin, unpin, update, and rollback planning.
- A rollback interrupted during writing restores the exact previous
  installation.
- A missing target version is never downloaded implicitly; it must already be
  cached.
- A semantic version comparison prevents `update` from being used as an
  accidental downgrade.
- Two cached payloads claiming the same version are treated as an immutable
  version violation.
- User-owned canonical content and its separate synchronization lock are not
  rolled back.

## 7. Deliberately deferred

This increment does not add:

- stable and preview channels;
- published archive checksums, attestations, or signature enforcement;
- downloading a missing rollback target; or
- CLI application self-updates.

See [content distribution](./agents-pack-distribution.md) for the registry,
artifact, and release workflow.
