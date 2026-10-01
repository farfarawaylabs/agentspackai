# Agents Pack CLI 0.3.2

- Fix the CLI being killed on launch (`Killed: 9`) on macOS 27, which also made
  the installer fail with "The downloaded Agents Pack executable did not start
  correctly." The macOS executables of 0.3.1 and earlier carry an invalid code
  signature that macOS 27 now enforces.
- Every macOS executable is now re-signed with Apple's `codesign`, strictly
  verified, and run on its own architecture before release.
- If an earlier CLI is killed on macOS 27, rerun the installer to get this
  version.
- No command or behavior changes.
