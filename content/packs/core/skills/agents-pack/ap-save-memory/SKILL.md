---
name: ap-save-memory
description: Save or update durable portable project memory as repository Markdown. Use automatically after verified learning that will help future work, when the agent is about to save native memory, or when the user asks to remember, keep local, forget, correct, or supersede project knowledge.
---

# Save Portable Project Memory

Save useful project knowledge directly with normal filesystem tools. Do not
route memory through an Agents Pack CLI command or provider-private storage.

## Decide whether the learning is durable

Save a memory without waiting for the user to ask when a verified fact,
decision, workflow, preference, or pitfall is likely to help a future session
in this repository.

Do not save:

- transient task progress, obvious repository facts, or generic knowledge;
- speculation, discarded hypotheses, or claims that have not been verified;
- credentials, secrets, tokens, private keys, sensitive payloads, or personal
  data the project does not need;
- large conversation summaries or raw logs; or
- rules that belong in `AGENTS.md`, decisions that belong in feature or
  architecture documentation, or operational contracts that belong in their
  canonical project files.

Memory is a retrieval aid, not a second task tracker or instruction system.

## Choose shared or local

Default to `shared` so useful project knowledge can be reviewed and committed
with the repository. Use `local` only when the memory is clearly specific to
the current user, machine, checkout, or local environment. For example, “when
you answer me in this project, be more concise” is local.

An explicit user choice of shared or local wins. When classification is truly
ambiguous and sharing could expose personal or machine-specific information,
ask before writing. Otherwise use shared.

Shared means Git-trackable and intended for a normal human-reviewed commit. Do
not automatically commit, push, merge, or publish a memory.

## Search before writing

Use `ap-recall-memory` or the same explicit search across both `shared/` and
ignored `local/` before creating a file.

- Update an existing active file when the meaning is the same.
- Create a new file only for distinct knowledge.
- When new knowledge replaces an old entry, set the old entry to
  `status: "superseded"` and set `superseded_by` to the replacement's path
  relative to `.agents-pack/memory/`. In the replacement, list the old relative
  path under `supersedes`.
- Do not delete ordinary corrected history. Delete only when the user explicitly
  asks or sensitive material must be removed from the current tree.

Deleting a tracked file does not erase it from Git history. If a credential or
secret was saved, remove it from the current tree, tell the user to rotate or
revoke it immediately, and treat any history rewrite as a separate destructive
operation requiring explicit authorization.

## Bootstrap storage safely

Use this layout under the current Git worktree root:

```text
.agents-pack/memory/
├── MEMORY.md
├── shared/
├── local/
└── .gitignore
```

Create only the directories and files needed for the save. Preserve unrelated
content. Ensure `.agents-pack/memory/.gitignore` contains this exact scoped rule:

```gitignore
/local/
```

Before reporting success, verify the Git boundary with `git check-ignore -v`
or equivalent evidence:

- the new local file is ignored;
- a shared file and `MEMORY.md` are not ignored; and
- a broader ancestor rule is not hiding all of `.agents-pack/` or `memory/`.

If an ancestor ignore rule conflicts, do not silently rewrite an unrelated
ignore policy. Explain the conflict and ask before changing that policy. Never
claim a shared memory will reach collaborators when Git will ignore it.

Do not follow a symlink that would place memory outside the worktree root.

## Write one concise Markdown file

Use a date and descriptive slug, for example
`shared/2026-08-04-api-idempotency.md`. If that name already belongs to a
different memory, add a short meaningful suffix.

Use this schema with real values rather than copying placeholders:

```markdown
---
title: "API retries require an idempotency key"
kind: "decision"
status: "active"
visibility: "shared"
applies_to:
  - "src/api/payments"
tags:
  - "payments"
  - "idempotency"
created_at: "2026-08-04"
updated_at: "2026-08-04"
created_by: "codex"
verified_at: "2026-08-04"
supersedes: []
superseded_by: null
---

Payment retries must reuse the original idempotency key.

## Evidence

- `src/api/payments/retry.ts` and its regression test.
```

Allowed `kind` values are `fact`, `decision`, `workflow`, `preference`, and
`pitfall`. Allowed `status` values are `active` and `superseded`. Required
frontmatter fields are `title`, `kind`, `status`, `visibility`, `applies_to`,
`created_at`, and `updated_at`. Add tags, creator, verification date,
supersession links, and evidence when known. Never invent provenance or a
verification date.

Keep the body short and specific. Update `MEMORY.md` only when an active shared
memory is important enough to serve as high-value orientation context. Never
mention or summarize a local memory in that tracked index.

## Respect the surrounding task

- Do not write memory during a read-only request or after the user says not to
  write.
- Save only after the learning is verified, at a natural checkpoint before the
  final response.
- A memory-write failure does not turn otherwise completed work into a false
  failure. Report the memory problem separately and accurately.
- When the user asks to forget a non-sensitive tracked memory, explain whether
  they want a current-tree deletion or an ordinary supersession. Do not rewrite
  Git history without separate explicit authorization.
