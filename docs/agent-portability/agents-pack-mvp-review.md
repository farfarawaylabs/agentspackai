# Agents Pack lifecycle MVP review

**Review date:** 2026-07-25  
**Decision:** Accept the lifecycle MVP as an internal prototype  
**Next-increment decision:** Go, with the constraints in section 8  
**Public-release decision:** No-go

> **Subsequent status — 2026-07-27:** The Git baseline, real first-party core
> content, pack schema v2, native subagent rendering, and representative
> real-agent conformance are now complete. Component selection, user-owned
> component state, drift-resolution choices, remote immutable resolution, and
> release packaging remain future work. See
> [core content conformance](./agents-pack-core-content-conformance-2026-07-27.md).

## 1. Outcome

The lifecycle MVP proved the part of Agents Pack that was most important to
validate first:

- one canonical pack can render into Claude Code, Codex, and Cursor locations;
- the CLI can install globally or in a repository;
- it can preview and apply a version update;
- it detects changes to managed content instead of overwriting them;
- interrupted mutations can be recovered;
- failed mutations restore the previous bytes;
- ejection removes only owned content; and
- current versions of all three agents discover the generated instructions and
  skills.

The implementation is strong enough to support the next internal product
increment. It is not ready to distribute publicly because content delivery,
trust, installation, migration, and release packaging do not exist yet.

## 2. What was implemented

The prototype contains four working commands:

```text
agents-pack init
agents-pack status
agents-pack update
agents-pack eject
```

It supports:

- repository scope for Claude Code, Codex, and Cursor;
- global scope for Claude Code and Codex;
- canonical instruction and skill components;
- agent-specific rendering;
- deterministic dry-run plans;
- a configuration file and output lockfile;
- full-file and managed-block ownership;
- operation locking;
- persistent transaction journals;
- rollback and next-run recovery;
- canonical path and symlink containment;
- fixture packs `0.1.0` and `0.2.0`; and
- isolated unit, filesystem, CLI, and real-agent tests.

The prototype intentionally does not contain a registry, network resolver,
signing, real content, subagents, plugins, MCP configuration, hooks, session
analysis, telemetry, or a desktop application.

## 3. Verification evidence

### Automated tests

`bun run check` passes:

- formatting;
- lint;
- TypeScript type checking; and
- 145 tests across 14 files.

The automated suite covers rendering, pack validation, hashing, state parsing,
managed blocks, path containment, symlinks, planning, atomic writes, operation
locking, transaction rollback, process-termination recovery, command behavior,
global-home isolation, drift refusal, and ejection.

### Real-agent conformance

The [real-agent conformance record](./agents-pack-conformance-2026-07-25.md)
verified:

| Agent | Repository v1→v2 | Global v1→v2 |
| --- | --- | --- |
| Claude Code 2.1.219 | Pass | Pass |
| Codex CLI 0.145.0 | Pass | Pass |
| Cursor Agent CLI 2026.05.01-eea359f | Pass | Not supported by this MVP |

Each instruction and skill check ran in a separate fresh process. All three
agents returned the v1 markers before update and the v2 markers afterward.

### Bun executable experiment

A standalone executable was created with:

```sh
bun build src/cli/main.ts --compile --outfile agents-pack
```

On the tested macOS arm64 machine:

- compilation succeeded;
- the executable was 58 MB;
- it ran without a separately invoked Bun runtime; and
- `help`, `init`, `status`, `update`, and `eject` completed successfully in an
  isolated repository.

This is enough to show that Bun compilation is viable. It is not a release
pipeline: other platforms, code signing, notarization, installation, upgrade,
checksums, and CI-built artifacts remain untested.

## 4. Answers to the Phase 9 questions

### Was the planner boundary sufficient?

Yes.

Adapters produce desired bytes. Inspectors describe current state. The planner
creates a complete deterministic operation list. Dry-run formats that same plan,
and mutations re-plan under the operation lock before writing. Interactive
approval is protected by comparing the approved plan with the locked plan.

This boundary made failure injection, rollback testing, and command-level tests
straightforward. It should remain.

One cleanup is worth doing later: `init`, `update`, and `eject` each contain
their own equivalent plan-signature and result-output code. That duplication is
small, but a shared command service would prevent those paths from drifting.

### Were any writes possible outside the executor?

No product output or lifecycle-state mutation bypasses `runMutation`.

The transaction subsystem delegates low-level writes to `atomic-write.ts` and
operation-lock coordination to `operation-lock.ts`; those helpers are part of
the executor boundary. Read-only code loads packs, state, paths, and status but
does not mutate them.

The path allowlist is checked again inside the transaction subsystem. This is a
useful defense even when a planner or lockfile is malformed.

### Did the lockfile contain enough information?

Yes for the current behavior, but not for the future merge model.

The v1 lockfile records:

- pack ID, version, and complete pack hash;
- every rendered output;
- stable component ID;
- adapter;
- output kind and path;
- output hash; and
- managed-block ID where relevant.

That is sufficient to detect missing, modified, malformed, or clean outputs and
to update or eject an unmodified installation safely.

It does not retain the installed Base bytes, a resolvable immutable source,
renderer version, publisher/signature identity, or user/official ownership.
Those are required before three-way merging, offline rollback, remote packs, or
user-owned components can be reliable.

### Was managed-block ownership understandable?

Yes.

Codex instructions use explicit start/end markers containing a stable component
ID and pack version. When Agents Pack appends a block to an existing file, it
also owns the separator immediately before the block. The locked hash covers
only the owned region. User bytes before and after it survive update and eject
exactly.

Malformed, duplicated, nested, edited, or separator-less markers stop the
operation. This is conservative and easy to explain.

The current parser deliberately supports only one Agents Pack block in a shared
file. Therefore a real v1 pack must have one canonical instruction component
for Codex. Supporting multiple independently managed instruction blocks would
require a parser and renderer change, not just another manifest entry.

### Did Bun packaging create a real distribution problem?

No blocking runtime problem was found.

The standalone compile experiment succeeded and exercised the full lifecycle.
The current repository is still only a development package:

- `package.json` is private;
- its `bin` points to a TypeScript source file;
- there is no checked-in build or release script;
- there are no cross-platform artifacts;
- there is no installer or shell completion;
- there is no signing/notarization;
- there is no application self-update mechanism; and
- the compiled macOS arm64 artifact is 58 MB.

These are unfinished release tasks, not evidence that Rust is required. Keep
Bun and TypeScript until a measured distribution requirement proves otherwise.

### Which adapter assumptions failed?

None of the selected repository or global discovery paths failed.

Claude Code, Codex, and Cursor all discovered the generated repository
instruction and skill content. Claude Code and Codex also discovered the global
content. The v2 files were visible immediately in fresh processes.

Two qualifications remain:

- the first Cursor run was blocked by missing CLI authentication, which was an
  environment issue and passed after login; and
- Cursor may discover the same skill through both Claude and Codex
  compatibility roots in an all-target installation. The MVP records this
  warning and does not claim a same-name winner.

### Is the planned next increment still correct?

Yes. The original next increment is still the right product direction:

1. real first-party content;
2. local creation of one user-owned skill;
3. explicit drift-resolution choices;
4. one subagent component; and
5. a remote resolver with integrity verification.

The order should include the schema and safety prerequisites in sections 6 and
8. Application self-update remains separate from content-pack update.

## 5. What the MVP taught us

The central architecture choice was correct: canonical content and
agent-specific placement should be separate.

The portability boundary is now concrete:

- Markdown instruction bodies move easily;
- standard-shaped skill directories move easily;
- discovery paths and instruction wrappers need adapters;
- shared instruction containers need explicit ownership;
- scope and precedence remain host-specific; and
- runtime memories, plugins, hooks, and permission models are not portable
  files.

The other important result is that refusing drift was the right MVP cut. It
allowed update and rollback safety to be proven without pretending that a
three-way merge system already existed.

## 6. Schema decisions before real content

### What can remain at schema version 1

The first real first-party pack can use the current schema without migration if
it remains deliberately narrow:

- one canonical instruction component;
- Markdown-only skills with inert references or assets;
- no executable scripts;
- no hooks, MCP configuration, plugins, or subagents;
- immutable local pack versions; and
- managed official files remain unedited.

This is enough to replace the smoke-test content and evaluate whether the
instructions and skills are useful.

### What needs a new schema before broader features

Do not quietly add fields to schema version 1. Introduce a versioned migration
when these features arrive:

1. **Executable-content declaration**

   Components need an explicit capability/risk declaration before a pack can
   contain scripts, hooks, MCP configuration, or plugins. Preview and approval
   must distinguish passive Markdown from executable or credential-bearing
   content.

2. **Base and provenance**

   The lock must retain either installed Base bytes or a content-addressed
   reference guaranteed to resolve them. It also needs the resolver/source and
   renderer version. This enables restore, fork, pin, rollback, and future
   Base/Local/Upstream merging.

3. **Official versus user-owned content**

   User-created skills must not be folded into the official pack lock as if
   Agents Pack owns their contents. Store their registry and lifecycle state
   separately, then let adapters render both sources.

4. **Subagent component kind**

   Adding subagents changes both the manifest kind and host-specific rendering.
   That should be an explicit pack schema version rather than an undocumented
   interpretation of an existing field.

5. **Remote source and update policy**

   Configuration will need the selected source/channel and pinning policy. The
   lock will need the exact resolved digest and verification identity. A
   channel is a lookup preference; the installed pack must remain immutable.

6. **Transactional migration**

   The current parsers intentionally reject unknown schema versions. Before a
   schema v2 CLI ships to users with v1 state, it needs a tested transactional
   v1-to-v2 migration and downgrade behavior.

## 7. Unresolved technical debt

### Before any public release

- Create a real Git baseline. The repository currently has no commits and all
  files are untracked.
- Add repeatable release builds for supported targets, checksums, signing,
  notarization, and installation instructions.
- Define content-source trust, immutable resolution, and signature verification.
- Add explicit permission review for executable or external-system content.
- Add state-schema migrations before changing any persisted format.
- Improve error output so every mutation failure consistently states whether
  recovery succeeded and what the next safe action is.

### Before expanding component types

- Decide whether Codex receives one aggregated Agents Pack block or multiple
  independently owned blocks.
- Remove the duplicated ownership-path knowledge currently shared between the
  inspector and transaction subsystem, while preserving independent
  defense-in-depth checks.
- Add a stable adapter/renderer version to rendered-state provenance.
- Add explicit user-owned component state rather than placing it inside the
  official pack.
- Test the Cursor all-target compatibility-root collision behavior.

### Useful but not blocking the next internal increment

- Extract shared command approval and plan-signature behavior.
- Add structured `--json` output for future UI integration.
- Add Linux and Windows filesystem tests before claiming support.
- Add CI and a coverage report.
- Decide whether a 58 MB standalone executable is acceptable after measuring
  download and startup behavior.

## 8. Go/no-go decision and next sequence

### Go: next internal increment

Proceed with the next internal increment under these constraints:

1. Commit the validated lifecycle MVP as a baseline.
2. Author one real first-party pack using only one instruction component and
   passive Markdown skills.
3. Add one user-owned skill flow with state separate from the official pack.
4. Add `restore`, `fork`, `pin`, and `stop managing` behavior, including Base
   retention.
5. Design pack/state schema v2 and add one subagent to exercise it.
6. Add a remote immutable resolver with digest and signature verification.
7. Only then consider application self-update or a desktop shell.

### No-go: public release

Do not publish this as an end-user product yet. A public release without trusted
content delivery, schema migration, a supported installer, and explicit
permission handling would turn the strongest part of the prototype—safe
ownership and updates—into an incomplete promise.

## 9. Final assessment

The lifecycle MVP achieved its purpose. It replaced the update architecture's
largest assumptions with working code and real-agent evidence.

The correct next move is not a rewrite and not a desktop app. It is a narrow
content increment that preserves the proven planner, lock, ownership, and
transaction boundaries while introducing provenance and user-owned content
carefully.
