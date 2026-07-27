---
name: ap-handle-errors-reliably
description: Design, implement, debug, or review application error handling and failure recovery. Use for exceptions, result types, error taxonomies and contracts, error translation, retries, backoff, timeouts, deadlines, cancellation, idempotency, cleanup, partial failure, background-job failures, user-facing errors, structured error logging, or tests of failure paths.
---

# Handle Errors Reliably

Make failure behavior part of the design rather than an afterthought. Preserve
the repository's sound idioms, but do not let broad catches, generic errors, or
automatic retries hide an unclear failure model.

## Trace the failure path before changing it

1. Identify the operation, its caller, and every boundary it crosses.
2. Read the relevant types, error contracts, framework handlers, retry
   middleware, timeouts, logs, metrics, traces, tests, and dependency docs.
3. Reproduce the failure when debugging. Preserve the original evidence and
   challenge whether the observed error is the cause, a translation, or a
   downstream symptom.
4. Determine who can recover, who must decide, and who needs a safe diagnostic.
5. State the intended caller-visible outcome and system state before editing.

Do not change an established public error code, retry promise, or partial
failure contract accidentally.

## Classify failures by meaning

Use the smallest useful taxonomy. Distinguish at least:

- expected absence or another normal domain outcome;
- malformed input or failed preconditions;
- unauthenticated or unauthorized access;
- missing or conflicting state;
- quota or resource exhaustion;
- transient dependency or concurrency failure;
- deadline exceeded or caller cancellation;
- permanent dependency rejection;
- violated application invariant; and
- programmer defect or unexpected internal failure.

Do not infer retryability from a generic status or exception name alone.
Classify from the documented operation semantics and actual failure cause.

Represent expected outcomes with the repository's idiomatic explicit result,
option, or typed domain error when callers are expected to branch on them. Use
exceptions or equivalent exceptional control flow for failures that should
unwind. Avoid both exception-driven normal control flow and elaborate result
wrappers that fight the language or framework.

## Preserve cause and add actionable context

Use specific types or stable machine-readable codes where callers need
different behavior. Keep the original cause when wrapping. Add safe context
such as the operation, dependency, resource type, attempt, or correlation ID;
do not copy secrets, credentials, raw personal data, unbounded payloads, or
attacker-controlled strings into errors.

Catch a failure only to:

- recover or provide a defined fallback;
- translate it at an ownership boundary;
- attach useful context while preserving the cause;
- perform required cleanup;
- retry under an explicit policy; or
- record it once where the necessary context exists.

Do not catch merely to log and rethrow at every layer. Do not return a default
value that makes failure indistinguishable from real empty data.

## Translate once at the right boundary

Keep domain and application failures independent of HTTP, CLI, UI, queue, and
provider details. At the outer boundary, map them to a stable consumer contract:

- safe machine-readable code;
- concise actionable message;
- relevant field or operation when disclosure is safe;
- retry guidance only when the caller can act on it; and
- correlation identifier when support or operators need it.

Unexpected failures should produce a generic public response and retain
diagnostic detail internally. Never expose stack traces, queries, internal
hostnames, filesystem paths, secret values, or dependency payloads.

Centralized boundary handling is a final safety net, not a substitute for typed
failures and local recovery where the system can genuinely recover.

## Retry only with a complete policy

Retry only documented transient failures and only when repeating the operation
is safe. Treat retry ownership, idempotency, attempt limits, elapsed-time
budget, backoff, jitter, server retry hints, cancellation, and exhaustion
behavior as one policy.

Avoid nested retry layers that multiply attempts. Never retry validation,
authentication, authorization, invariant, or other deterministic failures
without a changed precondition.

Read
[references/retries-timeouts-and-cleanup.md](references/retries-timeouts-and-cleanup.md)
before adding or changing retries, deadlines, cancellation, resource cleanup,
background work, or compensation.

## Make observability useful and safe

Record enough structured context to answer what failed, where, for which
operation, after how long, and with what outcome. Follow the repository's
logging and telemetry conventions.

- Correlate with a request, trace, job, or operation ID.
- Use a stable error class or code and low-cardinality operation name.
- Record retry count, timeout, cancellation, dependency, and duration where
  relevant.
- Log unexpected internal failures at the boundary that owns reporting.
- Do not report normal expected outcomes as noisy high-severity incidents.
- Redact sensitive values and inspect what exception objects or stack traces
  add automatically.

Do not rely on logs as the consumer contract. Do not log the same failure at
every layer.

## Design partial and asynchronous failure explicitly

For multi-step or fan-out work, define whether failure causes rollback,
compensation, retry, quarantine, resumable partial completion, or a reported
partial result. A database rollback cannot undo an email, payment, or published
event.

Observe every background task, promise, future, callback, stream, worker, or
subprocess. Route terminal failures to a durable status, dead-letter or
quarantine path, operator signal, or caller-visible result. Do not detach work
whose errors no one owns.

## Verify failure behavior

Test the state and contract, not just that an error was thrown. Cover:

- each meaningful failure class and its boundary translation;
- preserved causes and safe context;
- absence of secrets or internal details in responses and telemetry;
- retry eligibility, delay, exhaustion, and duplicate-effect prevention;
- deadlines, caller cancellation, and cleanup;
- partial failure, rollback, compensation, and resume behavior;
- background or stream termination; and
- observability signals without duplicate reporting.

Run the relevant tests, static checks, and build. Exercise a real failure path
when possible. Report any dependency, timeout, cancellation, or recovery path
that was not verified.
