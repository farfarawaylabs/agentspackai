---
name: ap-write-database-queries
description: Design, implement, review, debug, and optimize safe, correct, and efficient database queries and data-access code. Use for SQL, ORM query builders, repositories, document or key-value stores, query plans, indexes, pagination, N+1 problems, transactions, isolation, locking, retries, caching, connection pools, slow-query investigations, and database-related tests.
---

# Write database queries

Make database behavior correct and bounded before making it fast. Base query
design and optimization on the repository's real database, schema, data-access
code, workload, and evidence—not portable folklore about joins, indexes, or
query-plan node names.

## Orient before changing a query

1. Read the project documentation and inspect the database engine and version,
   schema, constraints, indexes, migrations, ORM or driver configuration,
   connection management, relevant data-access code, and tests.
2. Trace every caller and consumer of the query. Establish the required result,
   ordering, cardinality, consistency, authorization scope, and acceptable
   latency.
3. Inspect the query the database actually receives. For an ORM or query
   builder, capture generated SQL or the equivalent execution representation;
   do not optimize from application syntax alone.
4. Determine realistic data volume, distribution, skew, selectivity,
   concurrency, and call frequency. Production-like evidence matters more than
   performance on an empty development database.
5. Check current official documentation for the repository's engine, driver,
   and ORM before relying on remembered optimizer or transaction behavior.

Do not change query semantics accidentally while optimizing. Record the
baseline and define how improvement and correctness will be verified.

## Protect the data-access boundary

Keep queries, ORM operations, database-specific mappings, and persistence
errors in the data-access or infrastructure layer. Do not place queries in API
handlers, UI code, or domain rules. Expose purpose-specific repository or query
operations rather than leaking a general database client upward.

Return transport-neutral application models or projections. Do not expose lazy
ORM entities whose later property access can issue hidden queries. Keep
authorization and tenant predicates explicit and impossible for callers to
forget when protected data is involved.

## Make semantics explicit

Define:

- exact columns or fields returned and whether duplicates are valid;
- behavior for no rows, multiple rows, `NULL` or missing fields, and deleted or
  stale records;
- deterministic ordering, including a unique tie-breaker for pagination;
- time-zone, collation, case-sensitivity, and numeric precision behavior;
- consistency requirements, including read-after-write and replica lag;
- transaction and concurrency guarantees for writes; and
- upper bounds for rows, input lists, work, duration, and memory.

Without an explicit `ORDER BY` or datastore equivalent, result order is not a
contract. Database constraints remain the final defense for invariants such as
uniqueness and referential integrity; application checks alone are subject to
races.

Read
[references/query-correctness-and-security.md](references/query-correctness-and-security.md)
when designing a new query, dynamic filtering, ORM loading, pagination, search,
or NoSQL access.

## Keep every query safe and bounded

Use parameterized statements or safe query-builder bindings for values. Never
interpolate untrusted input into SQL, ORM query languages, operators, document
selectors, or expressions. Parameters generally cannot represent identifiers
or syntax; map dynamic fields, directions, tables, operators, and projections
through an explicit allowlist.

Select only required fields. Bound page and batch sizes, list arguments,
recursive depth, fan-out, time, and returned data. Propagate cancellation where
supported. Treat full scans as a deliberate choice based on workload, not an
accident caused by an unconstrained input.

Prevent N+1 behavior, but do not replace it blindly with one enormous join that
multiplies rows. Choose joining, eager loading, batching, aggregation, or
separate bounded queries based on relationship cardinality, data size,
round-trips, and measured plans.

## Design indexes from access patterns

Match indexes to actual filter, join, ordering, uniqueness, and pagination
patterns. Account for column order, operator support, data distribution, and
engine-specific behavior. Include the complete workload: every index consumes
storage and memory and adds write and maintenance cost.

Do not add an index merely because a scan appears in a plan. Sequential scans,
index scans, nested loops, hash joins, and other nodes can each be correct. Do
not force an index or planner strategy without evidence that the default plan
is wrong for representative values and without understanding the wider
workload.

Read
[references/performance-indexing-and-operations.md](references/performance-indexing-and-operations.md)
when investigating latency, plans, indexes, pools, caches, or production
capacity.

## Preserve correctness under concurrency

Group writes in a transaction when one business invariant requires them to
succeed or fail together. Keep transactions short and free of user interaction
or avoidable network calls. Choose isolation and locking from the anomalies the
operation must prevent, not from a default copied from another system.

Prefer atomic conditional writes, unique or exclusion constraints, version
checks, and engine-supported upserts over read-then-write logic. Acquire locks
in a consistent order. Retry only documented transient conflicts, and retry the
complete transaction with bounded backoff; never retry an unknown partial
effect blindly.

Read
[references/transactions-concurrency-and-testing.md](references/transactions-concurrency-and-testing.md)
before implementing multi-step writes, counters, inventory, financial state,
job claims, deduplication, retries, or consistency-sensitive reads.

## Optimize with an evidence loop

1. Reproduce the real query shape with representative parameters and data.
2. Measure end-to-end latency, database execution, round-trips, returned rows,
   pool wait, locks, and call frequency where available.
3. Inspect the generated query and an engine-native plan. Compare estimated and
   actual rows, loops, reads, sorts, spills, and filters—not only total cost.
4. Form one hypothesis and make the smallest change that tests it.
5. Re-measure with cold and warm effects understood. Check write impact and
   other important queries before accepting an index or configuration change.
6. Preserve a regression test, benchmark, query fingerprint, or monitoring
   signal appropriate to the risk.

`EXPLAIN ANALYZE` and similar tools execute the statement. Never run them
casually against a mutation or expensive production query. Use a safe
environment, read-only plan mode, or a transaction that is guaranteed to roll
back only when the engine's behavior is understood.

## Verify at real database boundaries

Use the actual production database engine for integration tests when behavior
depends on SQL semantics, constraints, query plans, isolation, locking, or
engine-specific features. Mocks and substitute in-memory databases are useful
for application tests but do not prove database behavior.

Test relevant cases:

- empty, singleton, duplicate, `NULL`, missing, and maximum-sized inputs;
- tenant and authorization isolation;
- deterministic pagination with equal sort values and concurrent changes;
- constraint violations, rollback, deadlocks, serialization conflicts, and
  retry exhaustion;
- time zones, collations, precision, and boundary timestamps;
- realistic data distributions and known skew;
- timeout, cancellation, pool exhaustion, and dependency failure; and
- query count or round-trip count for paths vulnerable to N+1 behavior.

Run relevant tests, static checks, and the build. For performance work, report
the baseline, changed measurement, dataset, parameters, and plan evidence.
State what was not tested; do not claim an optimization from query appearance.
