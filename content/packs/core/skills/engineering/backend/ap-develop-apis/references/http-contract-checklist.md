# HTTP contract checklist

Use the parts relevant to the API and preserve established public conventions
unless a deliberate migration is in scope.

## Resources, paths, and methods

- Model resources and relationships from the consumer's perspective; do not
  expose tables or internal service calls one-to-one.
- Keep path naming consistent and identifiers stable. Prefer shallow nesting;
  use links or filters when deeper nesting does not express real ownership.
- Keep `GET`, `HEAD`, and other safe operations free of requested side effects.
- Preserve idempotent semantics for `PUT`, `DELETE`, and other methods defined
  as idempotent by the protocol.
- Use `POST` for creation or non-idempotent processing. Use a named custom
  action when the domain operation is clearer than a forced CRUD metaphor.
- Treat method semantics as a contract, not just routing syntax.

See [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) and
the [Google Cloud API Design Guide](https://docs.cloud.google.com/apis/design)
for current primary guidance.

## Requests and responses

- Define explicit request and response DTOs. Do not bind writable fields
  directly to persistence entities or serialize all model properties.
- State content types and reject unsupported ones predictably.
- Return the narrowest correct success status. Use `201` with a resource
  location for creation where applicable; use `202` only when processing is
  genuinely asynchronous and provide a way to observe completion.
- Distinguish missing authentication (`401`) from authenticated callers that
  lack permission (`403`) without leaking resource existence when that creates
  a security issue.
- Use conditional requests such as `ETag` with `If-Match` when concurrent
  updates could silently overwrite one another.
- Define cache behavior explicitly for responses that may be cached. Include
  authorization and tenant boundaries in cache design.

## Errors

Use one predictable error format across the API. Include:

- a stable machine-readable type or code;
- a safe human-readable summary;
- field or cause details when useful and safe;
- a request or trace identifier; and
- documentation for recovery when the caller can act.

[RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
is a strong default for HTTP error representation. Extend it with
domain-specific fields only when clients benefit. Do not expose stack traces,
queries, internal hostnames, secrets, or sensitive resource attributes.

## Pagination, filtering, sorting, and search

- Bound page size and define a default.
- Use offset pagination for small, stable datasets where random page access
  matters. Use cursor pagination for large or frequently changing collections
  where continuity matters.
- Make ordering deterministic with a unique tie-breaker.
- Keep cursors opaque, scoped to the query and caller where needed, and
  resilient to tampering.
- Return navigation metadata consistently without an expensive total count
  unless consumers require it.
- Allowlist filter and sort fields. Define repeated, range, null, and invalid
  parameter behavior.
- Prevent arbitrary client expressions from becoming unbounded database work
  or injection surfaces.

## Compatibility and versioning

- Classify the API as internal, partner, or public and state its compatibility
  promise.
- Prefer backward-compatible additions and tolerant migrations.
- Detect breaking changes in schemas and generated clients during CI where
  possible.
- Version only when incompatible contracts must coexist. Choose path, header,
  media-type, or another strategy deliberately and apply it consistently.
- Publish deprecation and sunset behavior before removal. Observe real client
  use rather than assuming migration is complete.

Do not add a version prefix automatically to every new API. Versioning is a
compatibility mechanism, not a substitute for careful evolution.

## Machine-readable contract

Keep OpenAPI or the project's equivalent aligned with implementation,
including:

- operations and stable operation identifiers;
- authentication and authorization expectations;
- request and response schemas;
- success and error responses;
- constraints, formats, defaults, examples, and pagination;
- idempotency, concurrency, rate-limit, and retry headers; and
- deprecation information.

Use the latest version supported end-to-end by the repository's validators,
generators, gateways, and documentation tooling. Consult the
[current OpenAPI specification](https://spec.openapis.org/oas/latest.html)
instead of assuming a remembered version is supported.
