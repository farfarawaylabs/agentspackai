# Agents Pack CLI distribution

**Status:** Implemented and live since CLI 0.1.0
**Last updated:** 2026-10-01

This document explains how the standalone Agents Pack command is built,
installed, upgraded, and released.

## 1. CLI and content are separate releases

Agents Pack has two independent version lines:

| Release | Tag | Purpose |
|---|---|---|
| CLI | `cli-v0.1.0` | Executable lifecycle code |
| Core pack | `pack-core-v0.26.0` | Instructions, skills, and subagents |

This distinction is important. A new skill should not require users to
reinstall the executable, and a CLI fix should not silently change project
instructions.

GitHub’s generic “latest release” is not used because the repository contains
both release types. The explicit CLI registry is:

```text
https://farfarawaylabs.github.io/agentspackai/registry/v1/cli.json
```

## 2. Supported systems

The first release provides four standalone executables:

| Registry target | Bun compile target |
|---|---|
| `darwin-arm64` | `bun-darwin-arm64` |
| `darwin-x64` | `bun-darwin-x64` |
| `linux-arm64` | `bun-linux-arm64` |
| `linux-x64` | `bun-linux-x64-baseline` |

The baseline Linux x64 target favors compatibility with older CPUs. Linux
builds currently require glibc. Windows and musl Linux can be added later
without changing the registry schema.

The Bun runtime is compiled into each executable. Users do not need Bun,
Node.js, npm, or repository source files.

### macOS code signatures

Every macOS executable must carry a valid code signature. Apple Silicon kills a
process with `SIGKILL (Code Signature Invalid)` as soon as it touches a page
whose hash does not match the signature. macOS 27 also reads, at exit, the
symbol-table page that an invalid Bun signature covers, so a bad signature
there now kills the CLI on every run instead of staying dormant.

`bun build --compile` appends the bundle after the runtime was signed, and Bun
does not reliably re-sign the result:

- Bun before 1.4.1 hashes the final partial page zero-padded to 4 KiB, so every
  `darwin-arm64` build has one wrong page hash
  ([oven-sh/bun#32159](https://github.com/oven-sh/bun/issues/32159)). CLI
  0.1.0 through 0.3.1 shipped with that defect.
- Bun 1.4.2 signs `darwin-arm64` correctly but still leaves `darwin-x64` with
  Bun's own Developer ID signature, which the appended bundle invalidates.

The release workflow therefore builds each macOS target on a runner of the same
architecture, replaces the signature with a fresh ad-hoc one
(`codesign --force --sign -`), requires `codesign --verify --strict` to pass,
and runs the executable before packaging it. The ad-hoc signature drops Bun's
hardened-runtime flag, so the JavaScript JIT needs no extra entitlements.

Alternatives considered:

- **Rely on a fixed Bun.** That would leave `darwin-x64` invalid, and Bun's
  signer has regressed before. The workflow still pins Bun 1.4.2, and local
  Apple Silicon builds made with Bun 1.4.1 or newer are valid without
  re-signing.
- **Re-sign on Linux with a third-party signer such as `rcodesign`.** That keeps
  the release on one runner but adds a tool to install and trust. It also
  cannot run the macOS executables before release.
- **Developer ID signing and notarization.** These need an Apple Developer
  account and release secrets. `curl` does not mark downloads as quarantined,
  so Gatekeeper does not require them for the installer path.

`codesign -v` exit status is the check that matters. macOS 26 and earlier
still run some invalidly signed executables, so a smoke test alone does not
prove the signature is valid.

## 3. Release artifacts

CLI version `0.1.0` publishes:

```text
agents-pack-0.1.0-darwin-arm64.tar.gz
agents-pack-0.1.0-darwin-x64.tar.gz
agents-pack-0.1.0-linux-arm64.tar.gz
agents-pack-0.1.0-linux-x64.tar.gz
agents-pack-0.1.0-checksums.txt
```

Each archive contains exactly one executable named `agents-pack`.

`package.json` is the CLI version authority. The build script validates that
this version agrees with:

- `registry/v1/cli.json`;
- the release entry and asset names; and
- the `cli-v<version>` Git tag.

Run the local metadata check:

```text
bun run cli:build \
  --validate-only \
  --registry registry/v1/cli.json \
  --tag cli-v0.1.0
```

Build the executable for the current supported host:

```text
bun run cli:build -- --tag cli-v0.1.0
```

Cross-compile an explicit target:

```text
bun run cli:build -- \
  --target linux-x64 \
  --output dist/cli/linux-x64/agents-pack \
  --tag cli-v0.1.0
```

Compiled production executables do not automatically load a user’s `.env` or
`bunfig.toml`.

Use Bun 1.4.1 or newer for a native macOS smoke test. An Apple Silicon build
from an older Bun is killed on macOS 27. A cross-compiled `darwin-x64` build
needs `codesign --force --sign -` before it is valid; see
[macOS code signatures](#macos-code-signatures).

## 4. Installer behavior

The public installer is served through the same Pages deployment as the
registries:

```text
https://farfarawaylabs.github.io/agentspackai/install.sh
```

The installer:

1. fetches the CLI registry unless `AGENTS_PACK_VERSION` selects an exact
   version;
2. detects macOS or Linux plus ARM64 or x64;
3. downloads the matching archive and the release checksum file;
4. verifies the archive SHA-256 checksum;
5. rejects archives that do not contain exactly one `agents-pack` entry;
6. starts the downloaded executable with `--version`;
7. rejects symlink destinations and non-file conflicts; and
8. atomically replaces `~/.local/bin/agents-pack`.

It does not use `sudo`, alter shell configuration, or modify an initialized
Agents Pack scope.

Supported overrides:

| Variable | Purpose |
|---|---|
| `AGENTS_PACK_VERSION` | Install an exact published version |
| `AGENTS_PACK_INSTALL_DIR` | Use an absolute destination other than `~/.local/bin` |
| `AGENTS_PACK_REGISTRY_URL` | Point tests or private deployments at another registry |
| `AGENTS_PACK_DOWNLOAD_BASE_URL` | Point tests or private deployments at another release base |

The last two are primarily for isolated integration tests.

## 5. Publishing a CLI version

Make the CLI change through a normal pull request:

1. update the version in `package.json`;
2. update `CLI_RELEASE_NOTES.md`;
3. add the version entry and move `latest` in `registry/v1/cli.json`;
4. run the complete repository check;
5. run the metadata validation and a native compiled-binary smoke test; and
6. merge the release commit into `main`.

Then tag that exact merge commit:

```text
git switch main
git pull --ff-only
git tag cli-v0.1.0
git push origin cli-v0.1.0
```

The tag-triggered workflow:

1. validates the repository, version, registry, and tag;
2. compiles each macOS target on a macOS runner of the same architecture and
   cross-compiles both Linux targets on Linux;
3. re-signs each macOS executable ad hoc and requires strict `codesign`
   verification;
4. smoke-tests the `darwin-arm64`, `darwin-x64`, and `linux-x64` executables;
5. packages each binary, confirms the archive contains only `agents-pack`, and
   calculates its SHA-256 digest;
6. consolidates and verifies the checksum file;
7. creates a draft GitHub Release and attaches every artifact;
8. publishes the immutable release; and only then
9. deploys the complete shared registry and installer through GitHub Pages.

Publishing Pages last prevents the installer from resolving a version whose
artifacts are not available.

## 6. Shared Pages deployment

Both the CLI and core-pack workflows deploy:

```text
install.sh
registry/
├── v1/
│   ├── cli.json
│   └── index.json
```

Both workflows use the same concurrency group so they cannot overwrite the
Pages artifact concurrently.

The `github-pages` environment must allow both tag patterns:

```text
pack-core-v*
cli-v*
```

Release immutability should remain enabled. Each workflow follows the required
draft, upload, then publish order.

## 7. Updating and uninstalling

Rerunning the installer upgrades or reinstalls the CLI. The checksum and
executable smoke check happen before replacement.

The CLI does not currently update itself. This keeps an installation script
from running implicitly during an unrelated content update.

Uninstalling the executable is explicit:

```text
rm "$HOME/.local/bin/agents-pack"
```

This does not remove managed instructions, skills, subagents, or lifecycle
state. Use `agents-pack eject` first when those should also be removed.

### Coordinating CLI and Core releases

Both workflows check the public URLs for the latest CLI archives, checksums,
and pack artifacts before publishing the shared Pages registry. If a latest
asset returns 404, the publication job defers without replacing the live
registry. The next release workflow checks again and publishes once both
release lines are available. Other HTTP or network failures fail the job.

When preparing both releases in one commit, tag that merge commit for both
release lines. Verify both releases and the public registry after both workflows
finish. If publication was deferred because of asset propagation, rerun the
publication job after all artifacts are public.
