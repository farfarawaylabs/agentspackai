# Security audit surfaces

Use this as a routing checklist, not as a requirement to report something in
every category. Follow the application's exposed and high-impact paths first.

## Identity and authorization

- Authentication flows, session lifecycle, tokens, recovery, enrollment,
  impersonation, and account linking
- Object-, operation-, property-, and tenant-level authorization
- Role and permission changes, service identities, delegated authority, and
  confused-deputy paths
- Identifier enumeration, ownership changes, stale authorization, and
  time-of-check/time-of-use gaps

## Input, output, and execution

- Injection into databases, templates, browsers, shells, interpreters, logs,
  headers, paths, and downstream protocols
- Request forgery, unsafe redirects, URL parsing differences, file access,
  uploads, archives, and parser expansion
- Serialization, deserialization, dynamic type or module loading, expression
  evaluation, and code generation
- Output encoding, cross-site scripting, content security policy, cross-origin
  policy, clickjacking, and browser storage
- Size, depth, time, concurrency, and resource-exhaustion controls

## Business logic and state

- Invalid state transitions, replay, duplicate effects, race conditions, and
  idempotency failures
- Price, quantity, entitlement, credit, quota, approval, and workflow bypasses
- Multi-step flows that trust client-maintained or stale server state
- Ordering, rollback, cancellation, and partial-failure behavior
- Abuse of intended features to cross an explicit product or security boundary

## Data and secrets

- Collection, access, tenant isolation, retention, export, deletion, backups,
  logs, analytics, and error disclosure
- Credentials in source, history, artifacts, images, client bundles,
  configuration, telemetry, or generated files
- Encryption and signing key ownership, rotation, randomness, nonce use,
  algorithm selection, verification order, and downgrade behavior
- Cache keys and invalidation involving identity, authorization, or private
  content

## Dependencies and delivery

- Direct and transitive dependency versions, reachable vulnerable behavior,
  abandoned packages, and unsafe install or build scripts
- Lockfile integrity, registry and source pinning, typosquatting, artifact
  provenance, and generated-code trust
- CI permissions, untrusted pull-request execution, secret exposure, release
  authority, and deployment credentials
- Container, serverless, operating-system, filesystem, process, network, and
  cloud identity boundaries
- Development tools, preview environments, debug endpoints, source maps, and
  environment separation

## APIs, integrations, and asynchronous work

- Webhook authenticity, freshness, replay protection, and event ordering
- Outbound requests, callback URLs, redirects, provider scopes, and
  over-privileged integration tokens
- Queue and event authorization, message validation, duplicate delivery,
  poison messages, and dead-letter handling
- Rate and cost amplification across APIs, jobs, email, payments, storage, and
  third-party services
- Error translation or retries that leak information or repeat unsafe effects

## AI and agent systems

- Untrusted instructions crossing from retrieved content, uploaded files,
  websites, messages, model output, or tool results into privileged decisions
- Tool authorization, argument validation, user confirmation, least privilege,
  and confused-deputy behavior
- Data leakage through prompts, context, memory, traces, evaluations, or
  provider retention
- Indirect prompt injection, unsafe output rendering, generated code or query
  execution, and model-controlled URLs or paths
- Resource and spend limits, loop termination, approval bypass, and unsafe
  autonomy
- Poisoned retrieval, memory, skills, plugins, MCP servers, dependencies, or
  evaluation data

## Native and lower-level code

When present, include memory safety, integer and length arithmetic, ownership
and lifetime errors, unsafe foreign-function boundaries, parser differentials,
archive and media codecs, sandbox escapes, privilege changes, and platform-
specific behavior. Prefer sanitizer output, fuzzing, or a minimal local harness
when safe and authorized.
