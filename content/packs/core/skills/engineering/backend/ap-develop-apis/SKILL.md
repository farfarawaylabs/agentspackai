---
name: ap-develop-apis
description: Design, implement, extend, debug, or review HTTP APIs with thin transport layers and reusable application and data-access boundaries. Use for routes, controllers, handlers, REST or resource-oriented endpoints, OpenAPI contracts, Postman collections, consumer API guides, request and response schemas, authentication and authorization, pagination, errors, idempotency, API security, observability, and API tests.
---

# Develop APIs

Build APIs whose contracts are predictable and whose business capabilities are
not coupled to HTTP. Preserve repository conventions where they are sound, but
challenge designs that leak transport or persistence concerns across layers.

## Orient before changing the API

1. Read the project documentation and inspect the actual framework,
   dependencies, routes, schemas, middleware, services, repositories, database
   mappings, API specifications, clients, and tests involved.
2. Trace at least one comparable request from transport to persistence or
   external systems and back. Identify the repository's real conventions
   rather than guessing from the framework.
3. Determine the API's consumers, compatibility commitments, trust boundaries,
   performance constraints, and failure modes.
4. Check current official documentation for framework behavior, security
   controls, protocol semantics, and specification versions. Match advice to
   the versions the repository uses.
5. State the proposed contract and layer responsibilities before implementing
   a material endpoint or redesign.

Do not redesign a public contract accidentally while refactoring its
implementation. Do not copy a neighboring pattern when that pattern is the
source of the problem.

## Keep the API tier thin

Treat this as an architectural invariant:

- **Transport/API layer:** Parse protocol input, establish caller identity,
  perform shape and syntax validation, invoke an application use case, and map
  its result or error to the protocol response.
- **Application/use-case layer:** Coordinate the business workflow,
  authorization policy, transaction boundary, idempotency, and calls to domain
  or infrastructure ports.
- **Domain layer:** Own business rules, invariants, policies, and domain
  concepts when the application warrants a distinct domain model.
- **Data-access/infrastructure layer:** Own persistence queries, ORM behavior,
  external clients, queues, caches, and provider-specific details behind
  explicit interfaces where substitution or isolation matters.

Routes, controllers, and handlers must not contain business decisions, database
or ORM queries, transaction orchestration, or direct vendor workflows. Do not
expose persistence entities as the API contract. Keep transport DTOs,
application inputs, domain objects, and persistence models separate when their
responsibilities differ.

Thin does not mean a one-line handler at any cost, and separation does not
require class-heavy ceremony. A small application may use functions and
modules; a vertical-slice architecture may colocate files by capability. The
boundary matters: the same business use case should be callable from HTTP, a
job, a CLI, or an event consumer without constructing an HTTP request.

Read [references/thin-api-architecture.md](references/thin-api-architecture.md)
when designing boundaries, moving logic out of handlers, or reviewing
architecture.

## Design the contract deliberately

Model the API around consumer tasks and stable domain resources, not database
tables or internal call graphs. Prefer standard HTTP semantics. Use a custom
action when a real domain operation does not fit resource create, retrieve,
update, or delete cleanly; do not distort the model merely to appear RESTful.

Define before coding:

- method, path, request, response, status codes, headers, and content types;
- authentication and object-, property-, and operation-level authorization;
- validation ownership and stable error behavior;
- retry, idempotency, concurrency, timeout, and cancellation behavior;
- pagination, filtering, sorting, caching, and rate or resource limits;
- compatibility, versioning, and deprecation expectations; and
- telemetry, documentation, and verification.

Use an explicit OpenAPI or equivalent machine-readable contract when the
project supports one. Keep it in the same change as the implementation. Use
the newest specification version supported by the repository's tooling, not a
version chosen from memory.

Read [references/http-contract-checklist.md](references/http-contract-checklist.md)
for detailed contract decisions.

## Secure failure paths as carefully as success paths

Treat every identifier, field, filter, sort key, callback URL, and upstream
response as untrusted. Authentication alone is not authorization. Enforce
resource ownership and business permissions in the application boundary so
alternate entry points cannot bypass them; route middleware may provide an
additional coarse gate.

Allowlist writable and readable fields. Bound request sizes, page sizes,
execution time, concurrency, and expensive operations. Do not return stack
traces, secret values, internal queries, or sensitive object properties.

Design retries instead of adding them blindly. For retry-sensitive mutations,
make idempotency state atomic, scoped, fingerprinted to the request, safe under
concurrent duplicates, and retained for a documented period. Make downstream
timeouts and retry limits explicit.

Read
[references/security-reliability-and-testing.md](references/security-reliability-and-testing.md)
before implementing authentication, authorization, mutations, webhooks,
external calls, rate limits, or other sensitive flows.

## Maintain consumer artifacts

Classify the changed API surface before finishing:

- **External API:** Supported for customers, partners, third parties, or client
  teams outside the product's internal system boundary.
- **Internal API:** Used only by project-owned frontends, services, workers,
  tools, or other components.
- **Mixed API:** Contains both surfaces; classify operations individually and
  keep internal details out of external artifacts.

Network exposure alone does not determine the classification. An
internet-reachable backend-for-frontend can still be internal; a partner API on
a private network can still be external.

For every external API change:

1. Ensure a root `postman/` directory contains an importable collection for the
   supported external API. Preserve existing collection organization and
   naming; otherwise use `postman/<api-name>.postman_collection.json`.
2. Create or maintain `docs/API_GUIDE.md` as the readable onboarding and usage
   guide for external developers.
3. Update the collection, guide, and machine-readable API contract in the same
   change whenever observable behavior changes.

For every internal API change:

1. Create or maintain `docs/INTERNAL_API_GUIDE.md` for developers and agents
   working on project-owned consumers.
2. Do not create or maintain a Postman collection solely for an internal API
   unless the user explicitly requests one.

If implementation changes without changing observable behavior, still verify
that the required artifacts exist and remain accurate; do not manufacture
meaningless documentation churn. If an external or internal API has no guide
yet, create the appropriate guide during the first change made under this
skill.

Treat OpenAPI or the repository's equivalent as the machine-readable contract,
the Postman collection as an executable consumer workspace, and the guide as
the human explanation. Prefer generation or automated consistency checks where
the toolchain supports them. Do not let the three become independent,
conflicting specifications.

Read
[references/api-consumer-artifacts.md](references/api-consumer-artifacts.md)
before creating or updating a Postman collection or either API guide.

## Implement without duplication

- Reuse existing middleware and contract primitives when their behavior is
  correct.
- Put shared business behavior in a use case or domain policy, not in a helper
  that still depends on request or response objects.
- Put shared persistence behavior in repositories or query modules, not in
  controllers.
- Centralize error translation and cross-cutting transport concerns where the
  framework makes that safe and legible.
- Pass explicit dependencies and keep dependency direction toward the
  application or domain.
- Avoid speculative abstractions. Extract a reusable boundary when there is a
  real responsibility or more than one caller, not merely to create layers.

## Verify behavior at the right boundaries

Test the use case without HTTP and, where practical, without a real database.
Test transport mapping separately. Add integration tests for persistence and
external adapters, plus contract tests for the public API.

At minimum, verify:

- success, invalid input, unauthenticated, unauthorized, and not-found paths;
- object- and property-level authorization across different callers;
- stable error codes and absence of sensitive data;
- empty, first, middle, and final pagination boundaries with stable ordering;
- duplicate and concurrent mutation behavior where retries are possible;
- transaction rollback and partial downstream failures;
- timeouts, cancellation, limits, and dependency failures when relevant; and
- compatibility with the checked-in API contract and existing clients.

For an external API, verify the Postman collection imports cleanly and its
representative requests use documented variables without embedded credentials.
For every API, verify the correct external or internal guide matches the
implemented consumer-visible behavior.

Run the relevant tests, static checks, and build. Exercise the real endpoint or
an equivalent integration path when possible. Report anything that was not
verified; do not infer runtime correctness from source inspection alone.
