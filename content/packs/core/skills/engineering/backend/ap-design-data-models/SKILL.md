---
name: ap-design-data-models
description: Design, extend, migrate, document, or review durable data models for relational databases, ORMs, document stores, key-value stores, and distributed NoSQL systems. Use for entities, relationships, tables, collections, documents, keys, constraints, ownership, normalization, denormalization, partitioning, multi-tenancy, history, auditability, sensitive-data lifecycle, schema evolution, and choosing between relational and NoSQL representations.
---

# Design data models

Model enduring domain truth before choosing tables or documents, then shape the
physical model around real invariants, access patterns, consistency needs, and
operational constraints. Do not let one screen, endpoint, ORM, or fashionable
database pattern define the domain.

## Orient before modeling

1. Read the product and technical documentation, existing schemas, migrations,
   ORM mappings, queries, events, APIs, authorization rules, and retention
   requirements.
2. Trace representative create, update, read, archive, restore, and delete
   workflows. Identify every writer and important reader.
3. Inspect the actual datastore, version, limits, consistency model, and
   deployment topology. Verify current official documentation rather than
   relying on generic relational or NoSQL memory.
4. Establish expected volume, growth, cardinality, skew, concurrency,
   geographic distribution, and access frequency without inventing scale.
5. Separate existing contractual behavior from accidental implementation
   details.

Do not redesign a model from entity names alone. Examples and sample records
are useful, but edge cases and state transitions reveal the real model.

## Move from conceptual to physical deliberately

Keep three levels distinct:

- **Conceptual:** Domain concepts, language, ownership, lifecycle, and
  invariants, independent of storage.
- **Logical:** Attributes, relationships, cardinality, optionality, identity,
  history, and consistency boundaries.
- **Physical:** Tables, documents, keys, constraints, indexes, partitions,
  projections, and engine-specific types.

Start with the conceptual and logical model even when using a datastore that is
designed from access patterns. Then derive the physical model from both domain
truth and required operations. This prevents a NoSQL access pattern from
becoming the only definition of the business while avoiding a relational model
that ignores how it will be queried.

## Define the model contract

For each durable concept, define:

- meaning, owner, source of truth, and lifecycle;
- stable identity and whether any natural key is also unique;
- attributes, units, precision, null or missing semantics, and defaults;
- relationships, cardinality, optionality, and deletion behavior;
- invariants and the layer or datastore primitive that enforces each one;
- authorization, tenant, residency, classification, retention, and erasure;
- current-state, historical, audit, and derived-data requirements;
- expected access patterns and consistency requirements; and
- growth bounds for records, relationships, documents, partitions, and keys.

Name concepts in domain language. Avoid vague buckets such as `data`,
`metadata`, `config`, `type`, or `status` without a defined vocabulary and
ownership.

## Choose storage from requirements

Choose a relational, document, key-value, graph, event, search, analytical, or
other representation from:

- relationship and query flexibility;
- invariant and transaction scope;
- read and write access patterns;
- consistency and availability requirements;
- data shape and evolution;
- volume, distribution, and latency; and
- team and operational capability.

Do not select NoSQL merely for scale or relational storage merely for
familiarity. Do not add a second datastore unless its benefit exceeds the cost
of synchronization, monitoring, recovery, security, and expertise.

When the system has a source of truth plus caches, search indexes, analytics,
materialized views, or read models, identify each projection as derived. Define
its writer, freshness, rebuild, reconciliation, and failure behavior.

## Make invariants executable

Classify each invariant:

- **Record-local:** Required fields, types, ranges, and state combinations.
- **Cross-record:** Uniqueness, references, totals, balances, exclusivity, and
  cardinality.
- **Workflow:** Allowed transitions, authorization, and temporal rules.
- **Distributed:** Conditions spanning services, regions, or datastores.

Use database constraints, conditional writes, transaction boundaries, and
domain policies where they provide the strongest correct enforcement. Do not
rely only on pre-write application validation for an invariant that concurrent
writers can violate.

If an invariant cannot be enforced atomically, document the consistency model,
idempotency, detection, repair, and user-visible behavior. “Eventually
consistent” is not a design until those details are explicit.

## Design identity, ownership, and lifecycle

Use stable identifiers that do not change when names, emails, paths, or other
business attributes change. Choose natural, surrogate, random, or time-ordered
identifiers from collision, privacy, locality, enumeration, offline creation,
merging, and distribution requirements—not a universal default.

Give each datum one authoritative owner. Duplicate only when a measured access,
availability, or integration need justifies it, then define:

- canonical source and authorized writer;
- propagation and ordering;
- acceptable staleness;
- conflict behavior;
- reconciliation and repair; and
- removal from every copy.

Model deletion explicitly. Hard delete, soft delete, archive, anonymization,
and immutable history solve different problems. Soft delete is not a default:
it complicates uniqueness, references, queries, authorization, retention, and
eventual erasure.

## Model security and privacy, not just storage

Minimize sensitive data before considering encryption. Classify fields and
define purpose, access, retention, deletion, logging, export, and residency.
Keep secrets out of general business records and identifiers; keys and paths
often appear in logs, indexes, URLs, or operational tooling.

Model tenant and owner boundaries so every access path can enforce them.
Consider tenant-scoped uniqueness and references. Use least-privileged runtime
roles and datastore policies as defense in depth, not as a replacement for
application authorization.

## Apply datastore-specific guidance

For relational tables, SQL ORMs, constraints, cascades, normalization,
inheritance, temporal models, and physical types, read
[references/relational-modeling.md](references/relational-modeling.md).

For document embedding, key design, single-table patterns, denormalization,
hotspots, distributed consistency, schema validation, and bounded records, read
[references/document-and-distributed-modeling.md](references/document-and-distributed-modeling.md).

For production schema changes, backfills, compatibility, document versions,
governance, retention, and model documentation, read
[references/schema-evolution-and-governance.md](references/schema-evolution-and-governance.md).

Use `ap-write-database-queries` when validating detailed access paths, indexes,
query plans, or transaction behavior.

## Challenge and verify the design

Before implementation, test the model against:

- the most common and most important workflows;
- missing, duplicate, contradictory, late, and out-of-order data;
- concurrent creation and updates;
- relationship and document cardinality extremes;
- tenant isolation and sensitive-data access;
- deletion, retention, restoration, export, and legal holds;
- partial propagation or projection failure;
- schema changes while old and new application versions coexist; and
- realistic growth, skew, and hotspot scenarios.

Compare at least one alternative and name the tradeoff that rejected it.
Prototype uncertain access patterns against representative data and the real
datastore.

Keep migrations and executable schema as the physical source of truth. Record
durable concepts, invariants, ownership, lifecycle, and non-obvious decisions
in the repository's existing technical documentation. Create a focused data
model document only when no canonical location exists; do not manually mirror
every column into prose that will drift.

Run relevant schema validation, migration checks, integration tests, static
checks, and the build. State what was not verified.
