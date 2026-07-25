# Agents Pack content

This directory contains the editable source for first-party Agents Pack
content. Git provides its history; source folders are not duplicated by
version.

Each pack is self-contained under `packs/`. Its `pack.toml` declares the pack
version and canonical components. Published pack versions will become immutable
release artifacts outside this source tree.

Test-only historical packs remain under `fixtures/`.
