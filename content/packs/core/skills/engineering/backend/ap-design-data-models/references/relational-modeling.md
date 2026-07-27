# Relational modeling

## Contents

- Identity and relationships
- Constraints and invariants
- Types and meaning
- Normalization and derived data
- Deletion, history, and inheritance
- Physical design and ORM review

## Identity and relationships

Give each durable entity a primary key. Decide separately whether a natural
business key must be unique. Natural keys can express domain truth but are poor
references when they are mutable, large, sensitive, or controlled externally.

Model cardinality and optionality explicitly:

- A one-to-one relationship normally requires a foreign key plus uniqueness.
- A one-to-many relationship places the foreign key on the child.
- A many-to-many relationship normally uses an association table whose own
  attributes, identity, lifecycle, and uniqueness are modeled deliberately.
- An ordered relationship needs an order key and a rule for concurrent
  reordering.

Avoid generic polymorphic references such as `(entity_type, entity_id)` when
they prevent referential integrity. Prefer explicit foreign keys or a modeled
supertype when integrity matters.

## Constraints and invariants

Use the database as the final arbiter for invariants it can express:

- `NOT NULL` for required values;
- `UNIQUE` for candidate keys, scoped by tenant or lifecycle when required;
- `CHECK` for record-local valid states;
- `FOREIGN KEY` for references and lifecycle coordination; and
- exclusion or equivalent constraints for non-overlap when supported.

Application validation provides better feedback but cannot replace a constraint
when concurrent writers can race. Verify engine-specific `NULL`, deferred
constraint, and collation behavior.

Choose `RESTRICT`, `CASCADE`, `SET NULL`, soft deletion, or explicit workflow
for each relationship. Cascades are useful for true ownership and dangerous
for loosely coupled or high-cardinality data. Test the entire cascade graph.

See the datastore's current constraint documentation, such as PostgreSQL's
[data-definition chapter](https://www.postgresql.org/docs/current/ddl.html).

## Types and meaning

Choose types from domain semantics and verified engine behavior:

- exact numeric types for money and other exact quantities;
- explicit units for measurements and durations;
- instants, local civil times, dates, and time zones as distinct concepts;
- bounded values through constraints or reference data;
- binary or native identifiers rather than ambiguous strings when useful; and
- structured columns only when their shape, indexing, and constraints are
  understood.

Do not choose the largest type automatically or impose arbitrary string lengths
without a domain rule. Defaults must represent a real default, not hide missing
input. Avoid sentinel values that conflate unknown, absent, unlimited, and not
applicable.

## Normalization and derived data

Start with a normalized operational core that expresses one fact in one place.
Normalize to prevent update, insertion, and deletion anomalies—not to satisfy a
normal-form label mechanically.

Denormalize only for an established access or availability need. For every
copied aggregate or snapshot, define its source, refresh transaction or event,
freshness, reconciliation, and rebuild. A stored order price may be a required
historical fact rather than duplication of the current catalog price; model
the semantics explicitly.

Separate transactional facts from analytical models when their workloads and
retention differ. Do not force a production OLTP schema to serve every
reporting shape directly.

## Deletion, history, and inheritance

Use timestamps and actor fields only when their semantics are defined.
`updated_at` is not an audit trail. If history matters, decide whether to store
events, immutable revisions, effective-dated records, audit entries, or change
data capture.

Soft deletion requires rules for uniqueness, foreign keys, restoration,
visibility, retention, cascading, and final erasure. Prefer hard deletion when
no business, recovery, or compliance requirement justifies tombstones.

Map inheritance deliberately. One table with a discriminator, separate subtype
tables, concrete tables, and JSON attributes have different integrity and
query tradeoffs. Do not accept an ORM default without inspecting generated DDL
and access patterns.

## Physical design and ORM review

Derive indexes and partitions from verified queries and operations. Do not
partition merely because a table is “large”; require a useful partition key,
pruning pattern, retention or maintenance benefit, and operational plan.

Inspect generated schema and migrations. Confirm:

- primary and foreign keys;
- tenant-scoped constraints;
- cascade behavior;
- native column types and precision;
- implicit join tables and uniqueness;
- enum and inheritance representation;
- indexes and index names;
- defaults evaluated by the application versus database; and
- whether production DDL acquires disruptive locks.
