---
name: ap-compress-todos
description: Condense an oversized or noisy repository TODO file into a concise, trustworthy handoff without losing active work, blockers, decisions, risks, or useful context. Use when the user asks to compress, clean up, reorganize, summarize, prune, or reduce a TODO.md, TODOs.md, task list, implementation checklist, completed-work log, roadmap handoff, or similar repository planning document.
---

# Compress Repository TODOs

Turn the canonical TODO document into a reliable guide to what matters next,
not a permanent transcript of every action taken.

## Find the source of truth

1. Read repository instructions and search for TODO, task, roadmap, and handoff
   documents rather than assuming a filename or location.
2. Determine which file is canonical from repository references, current use,
   scope, and content.
3. If multiple files appear authoritative, do not merge or delete them until
   their purposes and ownership are clear.
4. If no TODO document exists, report that there is nothing to compress. Do not
   create one merely because this skill was invoked.

Follow the repository's existing structure, terminology, ordering, checkbox
style, identifiers, and priority system unless they are the source of the
problem.

## Inventory before removing detail

Read the complete canonical document. Classify every material item as:

- active or next;
- blocked or waiting;
- pending decision;
- unresolved risk or follow-up;
- future or backlog;
- completed and still useful as milestone context;
- completed execution detail with little future value; or
- uncertain.

Preserve issue and PR references, decision rationale, constraints, dependencies,
acceptance criteria, migration or compatibility concerns, and links needed to
resume work.

Do not infer an owner, priority, deadline, status, or completion date that the
document and repository do not support.

## Verify completion

Do not trust a checked box or past-tense wording alone. For completed items that
affect the resulting handoff:

- inspect the relevant implementation, tests, configuration, schema, or
  documentation;
- distinguish fully complete work from partial implementation and deferred
  follow-ups;
- keep unresolved regressions, cleanup, migration, rollout, or verification
  work visible; and
- mark status as uncertain when verification is impractical or evidence
  conflicts.

Do not modify production code to make an item complete. This skill edits the
TODO document only.

## Compress deliberately

- Keep active work actionable and specific enough for another developer or
  agent to continue without reconstructing the entire history.
- Keep blockers, pending decisions, risks, and follow-ups explicit.
- Condense repetitive completed checklists into short milestone summaries that
  preserve the delivered outcome and any durable caveat.
- Remove low-value command transcripts, repeated verification notes,
  superseded intermediate plans, and step-by-step execution trivia.
- Merge duplicate items only after confirming that they describe the same work.
- Preserve meaningful ordering and priority. Do not silently reprioritize.
- Use Git history instead of creating an archive of removed detail by default.
  Create an archive only when the repository convention or user requires one.
- Never discard uncertain or unresolved work to make the document shorter.

For a large rewrite where the value of removed detail is ambiguous, present the
proposed organization and the uncertain items before editing.

## Choose a clear shape

Prefer the repository's existing useful structure. If none exists, use only the
sections the content needs:

```markdown
## Active

## Next

## Pending Decisions

## Risks and Blockers

## Backlog

## Recent Milestones
```

Omit empty sections. Keep `Recent Milestones` short; it is orientation, not a
changelog.

## Verify the result

Before finishing:

- compare the new document with the original and account for every unresolved
  item;
- search for identifiers, links, decisions, and blockers that might have been
  lost;
- check that Markdown structure, checkboxes, links, and anchors remain valid;
- inspect the diff for accidental status or priority changes; and
- confirm the compressed document is materially shorter and easier to resume
  from, not merely rearranged.

Report:

- which TODO document was compressed;
- the organization used;
- what categories of detail were condensed or removed;
- completion claims verified or left uncertain; and
- any conflicting sources, ambiguous items, or decisions still needing a
  maintainer.
