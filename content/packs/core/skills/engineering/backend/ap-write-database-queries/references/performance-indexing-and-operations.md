# Performance, indexing, and operations

Optimize database work as a system: application round-trips, connection wait,
query execution, locks, returned data, and call frequency all contribute to
latency and capacity.

## Establish the evidence

Capture:

- normalized query or operation fingerprint;
- generated SQL or datastore operation;
- representative parameter shapes without exposing sensitive values;
- call rate and latency percentiles;
- rows examined, returned, updated, or deleted;
- connection-pool wait and utilization;
- lock wait, deadlock, timeout, and error rates;
- query plan with estimates and, safely, actual execution;
- data volume, distribution, skew, and relevant statistics; and
- network round-trips and response bytes.

Average latency can hide the values and tenants that cause the worst plans.
Test common, empty, extreme, and highly skewed parameter values.

## Read plans without folklore

Plan node names are not verdicts:

- A sequential scan can be optimal for a small table or a query reading much
  of a table.
- An index scan can be slower when it causes many random row fetches.
- A nested loop can be excellent for a small outer input and disastrous when
  row estimates are wrong.
- A hash or merge join has build, memory, sort, and spill tradeoffs.
- A covering or index-only plan depends on engine capabilities and visibility
  or storage state.

Inspect the whole plan and compare estimates with actual rows and loops. Large
estimation errors can indicate stale statistics, correlated predicates,
parameter-sensitive plans, or unrepresented data skew. Look for work performed
and then discarded, repeated inner operations, sorts or hashes spilling to
disk, and high reads relative to returned rows.

In PostgreSQL, `EXPLAIN ANALYZE` actually runs the statement, and a sequential
scan is often chosen intentionally even when an index exists. Consult the
current [Using EXPLAIN documentation](https://www.postgresql.org/docs/current/using-explain.html)
before interpreting or executing a plan.

## Design indexes from the workload

Start with the access pattern:

- equality and range filters;
- join and foreign-key access;
- required ordering and pagination;
- uniqueness or exclusion constraints;
- frequent hot subsets;
- expression, full-text, spatial, JSON, or array operators; and
- fields needed for a genuinely valuable covering query.

Then verify engine-specific rules for column order, operators, collations,
partial predicates, included columns, and supported index types. A composite
index should serve a meaningful family of queries, not be a guess at every
possible filter combination.

Account for:

- write amplification and longer transactions;
- storage, memory, replication, backup, and maintenance cost;
- overlap with existing indexes;
- low-cardinality or highly skewed values;
- index build and lock behavior in production; and
- whether statistics and maintenance keep the index useful.

Do not remove an apparently unused index from a short observation window. It
may support rare operational, billing, reporting, or integrity work. Confirm
across a complete workload period and inspect constraint dependencies.

PostgreSQL documents both the benefits and overhead of indexes in its
[index chapter](https://www.postgresql.org/docs/current/indexes.html), including
engine-specific multicolumn, partial, expression, and covering behavior.

## Evaluate query changes

Common hypotheses worth testing include:

- reduce selected fields or returned rows;
- replace per-row calls with a bounded join, batch, or aggregate;
- make a predicate sargable or match an indexed expression;
- align deterministic pagination with an index;
- pre-aggregate an established expensive read;
- split a query whose joins multiply rows;
- replace a huge input list with a supported bulk or temporary-table strategy;
- remove redundant work or client-side filtering; and
- refresh or improve statistics when estimates are demonstrably wrong.

Do not assume a CTE, subquery, join, window function, or rewritten predicate is
inherently faster. Optimizer transformations and semantics vary by engine and
version. Measure both forms.

## Connection capacity

Reuse clients and pools according to the driver and deployment model. Size
capacity across every application instance, worker, job, and function—not per
process in isolation.

Bound acquisition wait and query duration. Avoid launching more parallel
database work than the pool and database can handle; application-level
`Promise.all` or similar concurrency can turn one request into pool
exhaustion. Distinguish connection wait from database execution in telemetry.

For ORM-specific behavior, consult current documentation. Prisma, for example,
documents [query optimization](https://www.prisma.io/docs/orm/more/best-practices)
and [connection pooling](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool)
separately because runtime and version affect ownership and defaults.

## Cache deliberately

Cache only after defining:

- the performance problem being solved;
- the exact key, including tenant and authorization scope;
- freshness and read-after-write requirements;
- TTL and invalidation ownership;
- negative-result behavior;
- stampede and concurrent-fill handling;
- maximum entry size and cardinality; and
- behavior when the cache is unavailable.

A cache can hide an inefficient query while adding stale-data and invalidation
failures. Measure database load and end-to-end behavior before and after.

## Production rollout

Treat indexes, statistics, query hints, timeouts, and pool changes as production
changes, not local code details.

- Inspect lock and online/concurrent build behavior for the exact engine.
- Test on representative data and observe replicas or distributed nodes.
- Roll out gradually when query-plan or capacity risk is material.
- Monitor both the target query and system-wide writes, locks, storage, pool
  wait, and latency.
- Define rollback before deployment. Some index builds and migrations cannot
  be reversed instantly.
- Remove temporary planner overrides or diagnostic logging.
