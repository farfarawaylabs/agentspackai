# API security, reliability, and testing

Use this checklist for any endpoint that reads protected data, mutates state,
invokes external systems, or can consume material resources.

## Authorization and data exposure

- Authenticate through one reviewed mechanism and define token, session,
  expiry, and revocation behavior.
- Authorize the operation, specific object, tenant, and affected properties.
  Test with at least two identities and cross-tenant identifiers.
- Enforce business authorization in the application boundary even if route
  middleware performs a coarse role check.
- Allowlist fields accepted for writes and fields emitted in responses.
- Never trust a client-supplied owner, tenant, role, price, or calculated
  value.
- Apply the same controls to batch operations, alternate identifiers, exports,
  admin paths, background processing, and indirect references.

Use the
[OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
as a threat-review baseline, especially object-, property-, and
function-level authorization; resource consumption; sensitive business flows;
SSRF; inventory; and unsafe consumption of third-party APIs.

## Input, output, and upstream boundaries

- Validate shape, type, format, length, range, cardinality, and allowed values.
- Use parameterized queries and contextual output encoding. Do not rely on
  generic "sanitization."
- Restrict user-controlled URLs, redirects, file paths, content types, and
  upload sizes. Protect server-side fetches against SSRF and private-network
  access.
- Treat upstream payloads as untrusted and validate them before use.
- Avoid logging tokens, cookies, credentials, authorization headers, request
  bodies with sensitive fields, or unbounded query strings.

## Resource limits and abuse

Bound request and response sizes, page sizes, batch sizes, concurrency,
execution time, retries, and downstream fan-out. Apply rate or quota controls
by the identity and resource that matter, not only by source IP.

Return `429` or another documented response with safe retry guidance when a
limit is temporary. Protect sensitive business flows such as signup, purchase,
reservation, password recovery, invitations, and expensive generation from
automation even when infrastructure capacity is sufficient.

## Idempotency and concurrency

Use idempotency for mutations that clients or infrastructure may retry.

- Scope the key to the caller, operation, and intended resource.
- Store a fingerprint of material request inputs and reject key reuse with
  different inputs.
- Claim or write the key atomically with the business transaction where
  possible.
- Define behavior for an in-progress duplicate, a completed duplicate, and a
  retry after failure.
- Replay the documented result rather than executing the side effect again.
- Set and document retention based on the realistic retry window.

Do not implement production idempotency or rate limiting with process-local
memory in a horizontally scaled or restartable service.

Use optimistic versions, `ETag`/`If-Match`, locks, or database constraints when
concurrent requests could violate invariants or cause lost updates.

## External calls and asynchronous work

- Set explicit connection and operation timeouts and propagate cancellation.
- Retry only transient failures and only when the operation is safe or
  idempotent. Bound attempts and use backoff with jitter.
- Avoid holding a database transaction open across slow remote calls when a
  durable workflow, outbox, or compensation is more appropriate.
- Validate webhook signatures over the exact raw payload, enforce an age or
  replay window, deduplicate events, and make handlers idempotent.
- For asynchronous requests, return a durable operation identifier and expose
  status and terminal failure.

## Observability

Record enough structured context to answer what failed, for whom, where, and
how long it took without exposing sensitive data.

- Correlate logs, metrics, and traces with a request or trace identifier.
- Use low-cardinality route templates, not raw paths or user identifiers, for
  metric and span names.
- Record method, route template, status, duration, error class, and relevant
  dependency outcomes.
- Add business outcome metrics at the application layer when HTTP status alone
  is ambiguous.

Follow the project's telemetry conventions. When using OpenTelemetry, consult
the current
[HTTP semantic conventions](https://opentelemetry.io/docs/specs/semconv/http/http-spans/)
rather than inventing attribute names.

## Test matrix

Test at the cheapest boundary that proves the behavior:

| Boundary | Prove |
|---|---|
| Application/unit | Business rules, authorization, state transitions, typed failures |
| Transport | Parsing, validation, status and header mapping, response shape |
| Repository/integration | Queries, constraints, transactions, migrations, mapping |
| Contract | Implementation matches the published schema and compatibility promise |
| End-to-end | Critical workflows operate through real infrastructure boundaries |

Add targeted cases for:

- cross-user and cross-tenant object access;
- omitted, extra, malformed, extreme, and duplicate inputs;
- writable and readable property allowlists;
- pagination under inserts, deletes, and equal sort values;
- simultaneous requests and repeated idempotency keys;
- rollback, timeouts, dependency failure, and cancellation;
- cache separation by authorization or tenant;
- rate-limit boundaries and recovery; and
- error responses that contain no internal or sensitive details.
