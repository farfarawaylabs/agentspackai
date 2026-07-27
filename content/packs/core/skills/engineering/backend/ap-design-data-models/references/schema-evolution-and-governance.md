# Schema evolution and governance

## Contents

- Keep compatibility during change
- Use expand, migrate, cut over, contract
- Engineer backfills
- Handle document versions
- Protect data lifecycle
- Document decisions without drift

## Keep compatibility during change

Assume old and new application versions, jobs, clients, replicas, events, and
cached records may coexist. For every change, define:

- which readers and writers understand each representation;
- deployment order;
- compatibility window;
- source of truth during transition;
- rollback or forward-fix behavior; and
- proof that the old representation is no longer used.

Review generated migrations rather than trusting an ORM diff. Inspect data
loss, table rewrites, locks, defaults, constraint validation, index builds, and
replica or distributed propagation for the exact engine and version.

## Use expand, migrate, cut over, contract

Prefer staged evolution:

1. **Expand:** Add compatible fields, tables, documents, indexes, or relaxed
   readers.
2. **Migrate:** Backfill existing data and repair invalid records.
3. **Cut over:** Switch authoritative writes and reads, using temporary dual
   behavior only when its consistency is designed.
4. **Verify:** Measure old and new representations, readers, errors, and
   invariants.
5. **Contract:** Remove obsolete code and data only after the compatibility
   window closes.

Renames, type changes, splits, merges, and new required fields often need this
sequence rather than one destructive migration. Prisma's
[expand-and-contract guide](https://docs.prisma.io/docs/guides/database/data-migration)
illustrates the pattern; adapt it to the repository's engine and deployment
model rather than copying its sample mechanics.

Down migrations are not automatically safe: dropped or transformed data cannot
always be reconstructed. Prefer tested backups, forward fixes, and explicit
recovery plans over a nominal reversible script.

## Engineer backfills

Make backfills:

- idempotent and restartable;
- bounded by batch, duration, and concurrency;
- checkpointed with visible progress;
- safe under concurrent writes;
- rate-limited to protect production traffic and replicas;
- observable for failures and invariant violations; and
- verifiable by counts, checksums, samples, or domain reconciliation.

Do not load an entire large dataset into memory or hold one transaction for the
whole migration. Define how rows created or changed during the backfill reach
the new representation.

Add constraints in stages when existing data might violate them: detect and
repair invalid records, introduce a compatible rule, validate safely, then make
it mandatory. Verify online or concurrent index and DDL behavior for the
engine.

## Handle document versions

Flexible-schema stores may allow representations to coexist. Choose among:

- eager migration;
- lazy migration on read or write;
- reader support for several versions;
- a new collection or table; or
- immutable historical versions plus a current projection.

Define the canonical version, writer behavior, index coverage, retirement
criteria, and how old records are tested. MongoDB documents a
[schema-versioning pattern](https://www.mongodb.com/docs/manual/data-modeling/design-patterns/data-versioning/)
for coexistence, but version fields add application and index complexity and
should solve a real migration need.

## Protect data lifecycle

For sensitive or regulated data, record:

- collection purpose and lawful or business need;
- classification and authorized roles;
- geographic and backup copies;
- retention start and expiry;
- deletion, anonymization, export, and legal-hold behavior;
- encryption and key ownership where required; and
- propagation to caches, logs, analytics, search, and derived models.

Do not assume encryption compensates for unnecessary collection or indefinite
retention. Avoid sensitive data in identifiers and operational metadata.

Audit requirements need immutable, attributable events or revisions with
defined access and retention. `created_at`, `updated_at`, and soft deletion do
not by themselves provide an audit trail.

## Document decisions without drift

Keep executable schema and migrations as the physical source of truth.
Document only information code cannot explain reliably:

- conceptual entities and relationships;
- domain vocabulary and invariants;
- ownership and sources of truth;
- consistency and lifecycle decisions;
- sensitive-data handling;
- major scale assumptions;
- rejected alternatives; and
- evolution or repair procedures.

Use the repository's existing architecture or technical documentation. Link to
schema definitions and migrations instead of copying every field. Update the
document when a durable decision changes, not for incidental migration syntax.
