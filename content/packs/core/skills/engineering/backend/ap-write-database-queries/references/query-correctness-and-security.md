# Query correctness and security

Use this guide to define what a query means and prevent caller-controlled input
from changing its structure or scope.

## Parameterize data; allowlist structure

Bind every data value through the database driver, ORM, or query builder. Safe
binding keeps query code separate from data and also handles encoding and types
consistently.

Do not concatenate or template untrusted values into:

- SQL, HQL, JPQL, or raw ORM fragments;
- document-store selectors, operators, aggregation stages, or scripts;
- search expressions;
- table, column, relation, or index names;
- sort directions, operators, functions, or projection lists; or
- row-level security or tenant predicates.

Identifiers and syntax usually cannot be bound as ordinary parameters. Convert
each supported external value to a hard-coded internal expression:

```text
"newest" -> ORDER BY created_at DESC, id DESC
"price-low" -> ORDER BY price ASC, id ASC
anything else -> reject
```

Escaping is not a substitute for parameterization. Stored procedures and ORMs
can still be injectable when they construct dynamic queries internally. Use
least-privileged database credentials and keep administrative or migration
capabilities separate from runtime access.

See the
[OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
for primary defensive guidance.

## Preserve result semantics

Specify and test:

- zero, one, or many expected rows;
- whether duplicates are meaningful or must be removed;
- `NULL`, missing, unknown, and empty values;
- case, accent, locale, and collation behavior;
- exact numeric versus floating-point calculations;
- inclusive and exclusive time or numeric boundaries;
- time-zone conversion and daylight-saving transitions; and
- whether soft-deleted, historical, or future-effective records are visible.

SQL uses three-valued logic: comparisons with `NULL` are not ordinary true or
false comparisons. `NOT IN` with a nullable subquery, nullable boolean
conditions, outer-join filters, and aggregate behavior commonly produce
surprises. Verify the actual engine semantics.

Never depend on incidental physical or index order. Add a deterministic order
when callers depend on position or pagination.

## Scope protected data

Make tenant, owner, visibility, and lifecycle predicates part of the
data-access operation, rather than optional fragments callers must remember.
Test the same query with at least two identities or tenants.

Database row-level security can provide defense in depth, but application
authorization and database policy must agree. Test with the runtime database
role; elevated development or migration roles can bypass controls.

Allowlist returned fields as carefully as writable fields. Avoid `SELECT *`,
whole-document projection, or automatic serialization when records may gain
sensitive fields later.

## Control ORM behavior

Inspect generated queries and query counts. Type-safe APIs prevent some syntax
errors; they do not guarantee safe raw fragments, efficient plans, bounded
results, correct authorization, or transaction semantics.

Watch for:

- lazy relations issuing hidden queries after the repository returns;
- eager loading that multiplies rows or loads large object graphs;
- per-record existence checks or updates;
- client-side filtering or sorting after an unbounded fetch;
- implicit transactions or one transaction per record;
- change tracking of read-only results;
- implicit casts or functions that change index use; and
- runtime values that violate assumptions expressed only by static types.

Prefer purpose-specific projections and explicit loading strategies.

## Avoid N+1 without creating row explosions

Measure query count and returned bytes. Choose among:

- one join when cardinality stays controlled;
- a batch query keyed by the parent identifiers;
- an ORM data loader or prefetch mechanism;
- a database aggregation;
- two bounded queries assembled in the application; or
- a precomputed read model for an established hot path.

Joining several one-to-many relations at once can multiply rows, repeat wide
parent data, and make pagination incorrect. A small fixed number of queries can
be better than either N+1 or a single enormous join.

## Pagination

Use offset pagination when result sets are modest, random page access matters,
and drift is acceptable. Use keyset or cursor pagination for deep or frequently
changing ordered sets.

For keyset pagination:

- order by an immutable or well-understood tuple with a unique tie-breaker;
- make the continuation predicate match the sort direction and `NULL` rules;
- index the filter and ordering pattern when justified;
- keep cursors opaque and resistant to tampering where clients supply them;
- bind cursors to relevant filters, tenant, and visibility scope; and
- test insertions, deletions, and equal sort values between pages.

## NoSQL and distributed stores

Model access around partition or shard keys. Bound fan-out and avoid scans or
cross-partition operations unless evidence says they are acceptable.

Define:

- read and write consistency;
- read-after-write expectations;
- conflict resolution and conditional-write semantics;
- hot-partition risk and key distribution;
- secondary-index consistency and cost;
- document or item size growth;
- pagination token stability; and
- transaction scope and limitations.

Do not translate relational rules mechanically. Use the current official
documentation for the specific datastore and SDK. For example, MongoDB's
[query optimization guidance](https://www.mongodb.com/docs/manual/core/query-optimization/)
describes engine-specific covered-query and index behavior.
