# Agents Pack CLI 0.1.0

- Add the first standalone Agents Pack command-line release.
- Support macOS and Linux on ARM64 and x64.
- Add a checksum-verifying installer that defaults to `~/.local/bin`.
- Add an explicit CLI release registry so content-pack releases cannot be
  mistaken for CLI releases.
- Keep the Bun runtime bundled so users do not need Bun, Node.js, or npm.
