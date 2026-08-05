# Agents Pack portable-memory conformance — 2026-08-04

## Purpose

This run verifies that current Claude Code, Codex, and Cursor sessions discover
Core `0.27.0`, automatically save a repository-specific user preference as
ignored local memory, and recall it from a fresh read-only session. It also
samples shared-by-default classification, duplicate avoidance, and explicit
memory maintenance.

## Environment

| Component | Tested version |
| --- | --- |
| macOS | 26.6, arm64 |
| Bun | 1.3.1 |
| Claude Code | 2.1.221 |
| Codex CLI | 0.145.0 |
| Cursor Agent CLI | 2026.07.23-e383d2b |
| Pack | `agents-pack-core@0.27.0` |

Each provider received the local Core pack in a separate disposable Git
repository. Fresh non-interactive processes were used for save and recall.

## Local classification and automatic save

The write-capable prompt was:

```text
When working in this repository, answer me concisely from now on.
```

Expected:

- load and follow `ap-save-memory` automatically;
- classify the user-specific response preference as local;
- create `.agents-pack/memory/.gitignore` with `/local/`;
- create one memory under `.agents-pack/memory/local/`;
- keep `MEMORY.md` free of local references; and
- verify that Git ignores the local file.

| Provider | Automatic skill use | Local classification | Ignore verification | Result |
| --- | --- | --- | --- | --- |
| Claude Code | Pass | Pass | Pass | Pass |
| Codex CLI | Pass | Pass | Pass | Pass |
| Cursor Agent CLI | Pass | Pass | Pass | Pass |

Claude created `local/2026-08-04-concise-responses.md`, Codex created the same
descriptive path in its repository, and Cursor created
`local/2026-08-04-concise-answers.md`. All used the documented frontmatter and
left the local directory ignored.

## Fresh-session recall

Each provider then received a fresh read-only prompt:

```text
Without editing files, use the installed portable memory workflow and answer
only with the response-style preference stored for this repository.
```

Claude returned the stored concise-response preference and named the active
local source. Codex loaded `ap-recall-memory`, explicitly searched ignored local
storage, and returned `Answer concisely.` Cursor returned the stored preference
from a fresh ask-mode process. All three passed without modifying memory.

## Shared default and duplicate avoidance sample

Codex received this verified durable project fact:

```text
The verified release branch for this disposable repository is main, and this
durable project fact should help future work.
```

It classified the fact as shared, created
`shared/2026-08-04-release-branch-main.md`, added only that shared entry to
`MEMORY.md`, and verified both paths were Git-trackable while `local/` remained
ignored.

Codex was then given a restatement of the existing concise-response preference.
It searched both scopes, found the active local entry, and created no duplicate.

## Explicit maintenance forward test

A fresh agent received an explicit request to use `ap-maintain-memory` in a
disposable repository containing:

- conflicting active `master` and `main` release-branch memories;
- a second active memory duplicating the verified `main` fact;
- a shared index containing the stale fact, a missing path, and a leaked local
  preference; and
- one ignored local preference memory.

The agent verified `main` against the repository contract and current branch,
kept the best-supported `main` entry active, marked the stale and duplicate
entries superseded with reciprocal links, and repaired the shared index. It
inspected but did not rewrite the healthy local memory. Final checks confirmed
coherent metadata and links, no active duplicate or resolved contradiction,
an active-shared-only index, correct Git ignore boundaries, and a clean diff.
It did not delete, commit, or push files.

The rendered OpenAI metadata sets `allow_implicit_invocation: false`, the skill
frontmatter requires an explicit user request for every provider, and the
always-loaded Core instructions do not mention `ap-maintain-memory`.

After this forward test, the maintenance contract gained one additional
privacy invariant: it runs
`git ls-files -- .agents-pack/memory/local` and reports any tracked local paths
without automatically changing the Git index. Automated rendering coverage
locks in that instruction; this specific failure case was not part of the live
maintenance fixture above.

## Finding resolved during conformance

The first Codex run discovered the installed Core instruction and memory skills
but merely promised to be concise without saving the preference. The original
Core wording said to save at a natural checkpoint but did not explicitly reject
a verbal promise as a substitute for the workflow.

The instruction was corrected to state that portable memory is automatic, to
require loading and following `ap-save-memory` when a user states durable
project knowledge, and to say explicitly that the agent must not merely promise
to remember. A fresh repository with the corrected instruction passed save and
recall. Claude and Cursor also passed with the corrected content.

## Automated evidence

`bun run check` passes 205 tests across 22 files. The suite verifies pack
schema, required-component expansion, deterministic provider rendering,
portable skill bytes, official update behavior, and ejection that removes
managed configuration while preserving shared and local memory files.

`bun run pack:build` produces
`dist/packs/agents-pack-core-0.27.0.pack`, and inspection confirms that the
artifact contains all three memory skills and their OpenAI metadata.

## Limits

This run samples one user preference across all providers, shared-default
classification and duplicate avoidance in Codex, and explicit maintenance in
a fresh agent. The maintenance workflow was not separately exercised through
each provider CLI. Automated and content review cover malformed or unwritable
memory, secrets, and explicit no-write behavior, but those cases were not each
exercised through every live provider. Model behavior remains nondeterministic;
this record proves the observed versions and prompts, not every possible future
response.

A later repeat in brand-new Claude and Codex repositories reinforced that
limit. Codex saved the ordinary prompt “When working in this repository, answer
me succinctly from now on.” automatically. Claude acknowledged the same prompt
but did not write memory on its first run. A second Claude prompt using the
native-memory cue “Please remember for future sessions in this repository that
I prefer succinct answers” created and verified
`local/2026-08-04-succinct-answers.md` correctly. This means instruction-only
automatic capture is strongly encouraged and observed, but cannot be described
as a deterministic hook. Explicit memory intent remains the most reliable
provider-neutral trigger in this release.

The Core instruction was then strengthened again with a mandatory checklist:
recall during orientation, evaluate durable learning before every final
response, run `ap-save-memory` before responding when learning is durable, and
treat a verbal acknowledgement as insufficient. In another brand-new
Claude-only repository, the original implicit prompt passed: Claude created
`local/2026-08-04-succinct-answers.md` without being told to use memory. Its
non-interactive permission mode prevented Claude itself from running the final
`git check-ignore` command, but an immediate external check confirmed the local
file was ignored and `.agents-pack/memory/.gitignore` remained trackable.
