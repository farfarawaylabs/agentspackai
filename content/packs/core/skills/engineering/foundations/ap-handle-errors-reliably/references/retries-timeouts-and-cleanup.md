# Retries, timeouts, cancellation, and cleanup

Use this reference when an operation may be repeated, interrupted, partially
completed, or left holding resources.

## Contents

- [Decide whether a retry is safe](#decide-whether-a-retry-is-safe)
- [Give retries one owner and one budget](#give-retries-one-owner-and-one-budget)
- [Make repeated effects safe](#make-repeated-effects-safe)
- [Use deadlines and propagate cancellation](#use-deadlines-and-propagate-cancellation)
- [Make cleanup unconditional](#make-cleanup-unconditional)
- [Handle partial and asynchronous failure](#handle-partial-and-asynchronous-failure)
- [Test temporal behavior deterministically](#test-temporal-behavior-deterministically)

## Decide whether a retry is safe

Require both:

1. evidence that the failure is transient; and
2. evidence that repeating the operation cannot create an incorrect duplicate
   effect.

Examples that may be transient include documented throttling, selected
connection failures, leader changes, deadlocks, serialization conflicts, or
temporary unavailability. Verify the dependency's actual contract. A timeout
does not prove that the remote operation failed; it may have committed after
the caller stopped waiting.

Do not retry:

- invalid input or unsupported operations;
- authentication or authorization failure;
- a missing resource when absence is definitive;
- invariant, uniqueness, or business-policy rejection;
- deterministic parsing or programming defects; or
- a non-idempotent operation without a deduplication or reconciliation design.

For a read-modify-write conflict, repeat the full operation from a fresh read
when that is the documented recovery. Retrying only the final write can repeat
the same stale decision.

## Give retries one owner and one budget

Choose one layer that understands both the operation and caller budget.
Inventory retries already performed by SDKs, proxies, service meshes, queues,
jobs, databases, and callers. Disable or coordinate overlapping policies so
attempts do not multiply across layers.

Define:

- eligible error classes or response codes;
- maximum attempts;
- maximum total elapsed time;
- exponential or another justified delay schedule;
- random jitter to prevent synchronized retry storms;
- `Retry-After` or equivalent server guidance;
- per-attempt timeout;
- cancellation behavior; and
- the final error and durable state after exhaustion.

Cap both delay and total duration. A retry policy that can outlive the request,
job lease, transaction, or user expectation is not bounded.

Prefer a maintained runtime or SDK retry facility when its semantics match the
operation. Do not stack a custom retry loop over an opaque built-in policy.

## Make repeated effects safe

Naturally idempotent reads and set-to-value operations are easier to repeat, but
still require consistency and resource budgets.

For mutation retries:

- scope an idempotency or deduplication key to caller, operation, and intended
  resource;
- bind it to a fingerprint of material input;
- claim it atomically with the business effect where possible;
- define in-progress, completed, failed, and expired-key behavior;
- retain it for the realistic retry and replay window; and
- return or reconcile the original outcome rather than executing again.

An idempotency key does not make an arbitrary implementation safe if the key
record and side effect can diverge.

## Use deadlines and propagate cancellation

Prefer an end-to-end deadline or remaining-time budget over unrelated fixed
timeouts at each layer. Derive shorter connection, provider, query, and tool
budgets from the caller's remaining time while reserving time to translate the
result and clean up.

Propagate cancellation through:

- network requests;
- database queries and transactions;
- streams and iterators;
- subprocesses;
- locks and semaphore acquisition;
- queues or workflow steps where supported; and
- child tasks.

Distinguish caller cancellation from deadline expiry, dependency timeout, and
internal failure in diagnostics. Do not report a user-aborted request as an
internal incident by default.

Cancellation is cooperative. Verify that the underlying library actually stops
work and releases resources. If cancellation cannot stop a remote mutation,
provide reconciliation or status lookup rather than assuming nothing happened.

## Make cleanup unconditional

Release files, locks, sockets, transactions, leases, temporary directories,
subscriptions, clients, spans, streams, and child processes on success, error,
timeout, and cancellation.

Use the language's structured cleanup mechanism—`finally`, `defer`, `using`,
RAII, context manager, scoped task group, or equivalent. Acquire resources in a
clear order and release them in reverse order. Keep cleanup idempotent so a
partially initialized operation is safe to unwind.

Do not let a cleanup failure silently replace the primary failure. Preserve the
primary cause and record cleanup failure as additional diagnostic context when
both matter.

## Handle partial and asynchronous failure

For work spanning multiple systems, choose an explicit pattern:

- transaction for one atomic store;
- outbox or inbox for durable message coordination;
- idempotent consumer for at-least-once delivery;
- saga or compensation for reversible distributed effects;
- durable workflow for long-running or paused operations;
- dead-letter or quarantine path for poison input; or
- reconciliation when the remote result is uncertain.

Do not claim atomicity across systems that cannot commit together.

Give background work a durable identity, owner, terminal status, retry policy,
and observability. Await or supervise child tasks. Ensure an unhandled
background failure cannot disappear after the initiating request succeeds.

## Test temporal behavior deterministically

Use fake clocks, injected delay functions, controlled schedulers, barriers, and
scripted dependency failures. Avoid tests that depend on real sleep timing.

Verify:

- exact eligible and ineligible failure classes;
- attempt count and delay bounds;
- jitter within the accepted range;
- server retry guidance;
- cancellation during delay and active work;
- deadline exhaustion;
- timeout after an uncertain remote commit;
- duplicate requests and concurrent keys;
- cleanup after partial acquisition;
- retry or compensation after process restart; and
- metrics and logs for success, retry, exhaustion, cancellation, and cleanup
  failure.

Official references:

- https://docs.cloud.google.com/storage/docs/retry-strategy
- https://docs.cloud.google.com/iam/docs/retry-strategy
- https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html
- https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-logs/
