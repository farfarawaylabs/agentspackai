---
name: ap-refresh-repo-docs
description: Maintain, audit, and update repository documentation so it agrees with the implemented code, configuration, commands, architecture, and current product intent. Use when a feature or subsystem change needs documentation; the user asks to refresh, reconcile, reorganize, or verify docs; documentation has drifted; a README, PRD, technical requirements, API guide, architecture document, or onboarding guide needs work; examples, commands, or links need validation; or the repository needs a concise documentation source of truth. Use ap-compress-todos instead when the primary task is reducing or restructuring a TODO file.
---

# Refresh Repository Documentation

Restore trustworthy documentation without erasing product intent or preserving
obsolete material for its own sake.

## Establish scope and authority

1. Read the repository instructions and relevant `PRD.md`,
   `TECHNICAL_REQUIREMENTS.md`, `TODOs.md`, `DESIGN.md`, README, documentation
   index, and contributor guidance when they exist.
2. Determine whether this is change-driven maintenance for a feature or
   subsystem, a focused correction, or a repository-wide audit. For
   change-driven maintenance, begin with the task and current diff and limit the
   documentation scope to the behavior and decisions they affect. Do not expand
   focused work into an unsolicited documentation reorganization.
3. For a multi-document refresh, write a short plan covering discovery,
   reconciliation, edits, and verification. A small isolated correction does
   not need a ceremonial plan.
4. Identify the authority for each disputed claim:
   - use code, tests, configuration, manifests, schemas, lockfiles, and real
     command entrypoints for **currently implemented behavior**;
   - use approved PRDs, roadmaps, specifications, and decisions for **intended
     or future behavior**;
   - use published schemas and compatibility commitments for **public
     contracts**, checking both their implementation and their normative
     status;
   - use accepted architecture decisions for **design intent**, while reporting
     when the implementation has diverged; and
   - update generated documentation at its source rather than editing generated
     output.

Code is not automatically authoritative for requirements, public contracts, or
deliberate future plans. When authorities conflict and intent is unclear, do
not silently choose a winner. Preserve the distinction and report the decision
needed.

## Maintain documentation with the change

Treat documentation as part of completing a material implementation change. A
new feature is material by default. Update the canonical documentation in the
same change when work affects:

- user-visible behavior or supported workflows;
- public or internal contracts, schemas, configuration, or compatibility;
- architecture, subsystem boundaries, dependencies, or data flow;
- data models, migrations, or persistence behavior;
- deployment, operation, observability, recovery, or failure handling;
- security, privacy, authorization, or trust assumptions; or
- non-obvious constraints that future developers and agents must preserve.

An internal refactor, test-only change, or local cleanup may not need a
documentation edit when it changes none of those surfaces. Verify that
conclusion rather than creating meaningless churn. Before finishing, report the
documents updated or the concrete reason no documentation change was needed.

## Inventory the documentation

Use repository search and filesystem inspection rather than guessing common
paths. Include relevant:

- root orientation files and contributor guides;
- product, technical, architecture, API, operations, security, and
  troubleshooting documentation;
- examples, templates, diagrams, and documentation configuration;
- TODO, roadmap, migration, and handoff documents;
- package- or service-level docs in a monorepo; and
- references to documentation paths from agent instructions, CI, scripts, and
  other docs.

Respect the repository's established casing and folder conventions. Do not
introduce `.agentspack`, `docs`, `Docs`, or another hierarchy merely because it
is familiar. Exclude dependencies, build output, coverage, vendored sources,
generated sites, caches, and historical archives unless the task explicitly
includes them.

Use the current diff and recent relevant history to locate likely drift when
useful, but do not assume they describe every undocumented change.

## Reconcile claims against reality

For every material document in scope:

1. Identify its audience, purpose, owner if known, and whether it describes
   current behavior, a contract, a decision, or a plan.
2. Trace material claims to the actual code paths and configuration that
   implement them. Read enough of the call path to avoid matching a name and
   assuming the behavior.
3. Verify commands against scripts, CLI help, task definitions, or entrypoints.
   Verify paths, package names, environment variables, defaults, ports, feature
   flags, versions, and prerequisites.
4. Verify architecture descriptions against current boundaries, dependencies,
   data flows, storage, background work, and external integrations.
5. Check examples against current types, schemas, request and response shapes,
   and supported APIs.
6. Classify content as accurate, stale, duplicated, misplaced, generated,
   intentionally forward-looking, or uncertain.

Do not infer that an unimplemented plan was abandoned merely because it is not
in the code. Label it `planned`, `proposed`, `pending`, or `not implemented`
when that status is supported. Do not document unfinished local work as shipped
behavior.

## Edit for a small source of truth

- Correct false or stale claims and fill gaps that materially affect use,
  development, integration, or operations.
- Follow the repository's established documentation structure and naming. Do
  not reorganize it merely to match the Agents Pack fallback.
- Keep root orientation docs concise. Move detailed explanations to the
  repository's established documentation area and link to them when doing so
  improves navigation.
- Prefer one canonical explanation. Replace useful duplicates with a short
  pointer; do not leave competing copies.
- Keep important decisions, rationale, alternatives, tradeoffs, and
  reconsideration conditions in the feature or subsystem document that owns
  them. Put a cross-cutting decision in the architecture document that owns the
  shared concern. Do not create a separate decision log unless the repository
  already uses that convention.
- Preserve important rationale and constraints. Remove changelog-like history
  from frequently loaded context unless it still changes decisions.
- Use consistent terminology and status language across the documentation set.
- Update indexes, relative links, anchors, diagrams, examples, onboarding
  pointers, agent instructions, and automation after moving or renaming docs.
- Preserve meaningful user-authored material. Merge or delete only when its
  replacement and references are understood.
- Do not modify production code merely to make documentation true unless the
  user separately asks for the implementation change.

Do not create a new document for every module. Add documentation when it has a
clear audience and durable value; otherwise improve the nearest canonical
document.

When a repository has no clear documentation structure, read
[references/feature-and-subsystem-documentation.md](references/feature-and-subsystem-documentation.md)
and use its small fallback structure and document template. Do not introduce
the fallback when an established structure already exists.

## Maintain PRDs and recognize TODO drift

Keep a canonical PRD focused on the current problem, product boundaries, core
workflows, important constraints, and relevant near-term decisions. Separate
implemented behavior from future intent. Move low-level implementation detail
to technical documentation when it does not belong in the PRD.

Treat TODO documents as handoff tools rather than permanent event logs. Correct
small stale claims when they are directly within the refresh scope, but do not
silently turn a documentation audit into a large task-list rewrite. Use the
`ap-compress-todos` skill when substantial pruning or restructuring is needed.

## Verify the refresh

Use the cheapest checks that exercise the edited claims:

- inspect the final diff for accidental scope changes and lost content;
- run the repository's formatter, linter, documentation build, or link checker
  when available and relevant;
- exercise documented commands with help, validation, dry-run, or a safe
  disposable environment before using a mutating production command;
- compile or run examples when practical;
- check changed internal links, anchors, file paths, and diagram sources; and
- search for stale names, paths, versions, and moved-document references.

Do not claim a command, link, example, or document build was verified unless it
was actually checked. Record checks that were unavailable, unsafe, too
expensive, or inconclusive.

## Report

Summarize:

- documents added, updated, moved, merged, or removed;
- the important implementation or product facts reconciled;
- verification performed and its result;
- ambiguity, authority conflicts, and assumptions; and
- remaining documentation gaps or decisions requiring a maintainer; and
- when no documentation changed, the verified reason it was unnecessary.
