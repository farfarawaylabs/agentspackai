# Thin API architecture

Use this guide to decide where API-related behavior belongs. Adapt names and
folder layout to the repository; preserve the responsibilities.

## Dependency flow

```text
HTTP / RPC / GraphQL / CLI / job / event adapter
                    |
                    v
          application use case
             |            |
             v            v
       domain policy   ports/interfaces
                           |
                           v
                database and external adapters
```

Dependencies point toward application and domain behavior. Framework,
transport, database, and provider details stay outside those inner
responsibilities.

## Responsibility test

Ask, "Would this behavior still be required if this use case were triggered by
a queue, scheduled job, CLI, or a different protocol?"

- If yes, it does not belong only in the HTTP handler.
- If it describes HTTP parsing, headers, cookies, content negotiation, or
  status mapping, it belongs in the transport adapter.
- If it decides whether an operation is allowed or how the business workflow
  behaves, it belongs in the application or domain.
- If it describes how data is stored or a provider is called, it belongs in an
  infrastructure adapter.

## Transport/API layer

The transport layer may:

- bind path, query, header, and body inputs to a transport DTO;
- validate required shape, syntax, basic ranges, and content type;
- derive authenticated identity from trusted middleware;
- construct an application command or query;
- invoke a use case;
- translate typed results and errors to status codes, headers, and response
  DTOs; and
- attach protocol-level cache, location, retry, or tracing headers.

It must not:

- perform ORM or SQL queries;
- decide prices, eligibility, state transitions, entitlements, or other
  business rules;
- coordinate transactions or multi-step provider workflows;
- use request or response objects inside business services;
- return ORM entities directly; or
- treat a route-level role check as the only object-level authorization.

## Application/use-case layer

The application layer should express a complete caller-visible operation. It
may:

- load required data through ports;
- enforce object-level and workflow authorization;
- coordinate domain rules;
- own transaction and idempotency boundaries;
- call external capabilities through ports;
- emit events or schedule work; and
- return a transport-neutral result or typed failure.

Keep application code independent of HTTP status codes, framework decorators,
cookies, and response objects. Use business-relevant errors such as
`OrderNotFound`, `PaymentAlreadyCaptured`, or `CallerCannotEditOrder`; translate
them at the adapter.

## Domain layer

Use a distinct domain layer when rules and state transitions have enough
complexity to benefit from it. Domain code should protect invariants regardless
of entry point or persistence mechanism.

Do not manufacture domain entities for a simple read-only CRUD service. The
thin API boundary remains useful even when the application layer is a small
function over a repository.

## Data-access and infrastructure layer

Place SQL, ORM mappings, storage-specific filtering, remote API clients, queue
SDKs, and cache details here. Return application-facing models or projections,
not lazy ORM objects that leak persistence behavior upward.

Introduce an interface or port when it protects the application from a real
external concern, supports testing, or enables multiple implementations. Do
not create one-method interfaces mechanically around every function.

## Validation placement

Split validation by meaning:

- **Transport:** Is the payload well-formed? Is the timestamp parseable? Is a
  required field present?
- **Application/domain:** Does the referenced resource exist? May this caller
  use it? Is this state transition legal? Is this value allowed by current
  business policy?
- **Persistence:** Enforce final integrity with constraints such as uniqueness,
  foreign keys, and optimistic versions. Map violations to typed application
  failures rather than leaking database errors.

Sanitization is not a substitute for parameterized queries, contextual output
encoding, or explicit allowlists.

## Vertical slices are compatible

Thin tiers describe boundaries, not a required top-level directory tree. A
capability may be colocated:

```text
orders/create/
  route
  request-schema
  create-order
  order-repository-port
  persistence-adapter
  tests
```

The route must still delegate to `create-order`, and `create-order` must not
depend on the route or framework.

## Architecture review checks

- Can the use case run without constructing framework request/response
  objects?
- Can it be unit tested without starting the HTTP server?
- Are business permissions enforced when called outside this route?
- Can persistence or a provider change without rewriting the contract?
- Are transport DTOs insulated from database schema changes?
- Is the transaction boundary around the business operation rather than the
  handler's incidental steps?
- Is abstraction proportional to actual complexity?
