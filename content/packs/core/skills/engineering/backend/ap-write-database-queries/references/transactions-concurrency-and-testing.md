# Transactions, concurrency, and testing

Design from the business invariant and the failures that concurrent execution
can produce.

## State the invariant

Write the rule in application terms:

- inventory must not fall below zero;
- one active reservation may exist for a resource and interval;
- an idempotency key may produce one committed effect;
- a balance transfer updates both accounts or neither;
- a worker may claim a job once; or
- a caller must not overwrite a newer version.

Then identify every code path that can change the relevant state. A transaction
in one repository method does not protect an invariant if another writer
bypasses it.

## Prefer database-enforced correctness

Use the strongest simple primitive the engine supports:

- unique, foreign-key, check, or exclusion constraints;
- atomic update with a predicate;
- compare-and-set or optimistic version;
- engine-supported upsert;
- row or advisory lock when necessary; or
- serializable execution for an invariant that cannot be expressed otherwise.

Application "check then insert" or "read then update" is unsafe when another
transaction can change the result between statements. Constraints are not
merely validation; they arbitrate races. Catch and translate the expected
constraint failure.

## Choose isolation from anomalies

Determine whether the operation must prevent dirty reads, nonrepeatable reads,
phantoms, write skew, lost updates, or stale replica reads. Verify the engine's
actual isolation semantics—systems use the same level names differently.

Higher isolation is not free and lower isolation is not automatically wrong.
Choose the minimum level or explicit locking pattern that protects the stated
invariant, then test it concurrently.

PostgreSQL's current
[transaction isolation documentation](https://www.postgresql.org/docs/current/transaction-iso.html)
illustrates how isolation levels and serialization anomalies are
engine-specific.

## Keep transactions small

- Begin immediately before the protected database work and commit immediately
  after it.
- Do not wait for user input inside a transaction.
- Avoid slow external calls, file work, or unrelated computation while holding
  locks.
- Query and lock rows in a consistent order across code paths.
- Select only the rows needed for locking.
- Make transaction ownership explicit; avoid nested helpers that silently
  commit or use a different connection.
- Propagate the transaction context through every participating repository
  operation.

When external side effects must coordinate with a commit, use an appropriate
pattern such as an outbox, durable workflow, idempotent consumer, or
compensation. A database rollback cannot undo an email, payment request, or
published message.

## Retry safely

Retry only errors documented as transient, such as serialization conflicts,
deadlocks, or selected connection failures.

- Retry the entire transaction from a fresh snapshot.
- Bound attempts and elapsed time.
- Back off with jitter when contention is possible.
- Ensure external effects are absent, deferred until commit, or independently
  idempotent.
- Surface exhaustion with enough safe context to diagnose it.
- Do not retry syntax, constraint, authorization, or other deterministic
  failures.

## Read consistency and replicas

State whether a read may be stale and whether it must observe a preceding
write. Replica or follower reads can violate read-after-write assumptions even
when each individual query succeeds.

Route consistency-sensitive reads to an appropriate source or carry a
documented consistency token when the datastore supports one. Do not use a
cache or replica for authorization, uniqueness, job claiming, or financial
decisions unless its consistency model protects the invariant.

## Test with real concurrency

Use the production database engine and multiple independent connections.
Coordinate operations with barriers or hooks so the test exercises the
intended interleaving rather than hoping a race occurs.

Verify:

- exactly one winner where uniqueness is required;
- no lost update or negative inventory;
- rollback after failure at each step;
- lock timeout and deadlock behavior;
- serialization retry and retry exhaustion;
- transaction context reaches every write;
- an external effect occurs only after or consistently with commit; and
- reads meet the stated consistency after writes and through replicas.

Avoid tests that assert only the final happy-path row count. Assert each
caller's result and error as well as the committed state.

## Test query behavior

Integration tests should cover:

- exact projection and authorization scope;
- deterministic order and pagination continuation;
- `NULL`, duplicates, empty sets, and maximum input size;
- constraints and mapped persistence errors;
- generated query count for N+1-prone paths;
- time-zone, precision, collation, and boundary behavior; and
- cancellation, timeout, pool acquisition, and dependency failure where
  material.

Use representative fixtures for performance-sensitive work. A unit test with
ten uniform rows cannot validate a plan intended for millions of skewed rows.
Keep performance assertions broad enough to avoid noisy timing failures; prefer
plan shape, bounded work, query count, and monitored regressions where direct
latency tests are unstable.
