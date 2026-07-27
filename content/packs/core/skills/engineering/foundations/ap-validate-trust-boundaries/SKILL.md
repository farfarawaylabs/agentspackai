---
name: ap-validate-trust-boundaries
description: Design, implement, debug, or review validation for data crossing a trust or representation boundary. Use for HTTP or RPC input, forms, CLI arguments, environment variables, configuration, files and uploads, queues, events, webhooks, database or cache records, third-party responses, schemas, parsing, coercion, normalization, allowlists, size limits, validation errors, or malformed and adversarial input tests.
---

# Validate Trust Boundaries

Validate data before it can create invalid state, excessive work, or unintended
authority. Client-side types, generated clients, internal networks, persisted
records, and third-party SDKs do not make external data trustworthy.

## Inventory boundaries before writing schemas

1. Trace where data originates, how it is encoded, every parser or conversion,
   and where it affects behavior or state.
2. Include less obvious boundaries: environment and config, CLI arguments,
   queues, webhooks, imports, caches, database rows written by older versions,
   provider responses, filenames, URLs, and generated model or tool output.
3. Read the repository's schemas, domain invariants, parser settings, unknown
   field behavior, size limits, security controls, and consumer contracts.
4. Determine which layer owns syntax, business meaning, authorization, and
   storage integrity.
5. Define accepted, rejected, and normalized forms before implementation.

Do not copy a neighboring schema without verifying that its limits and
semantics match the current boundary.

## Limit work before parsing

Reject unsupported content types, encodings, protocol versions, and excessive
bytes before expensive parsing where the platform allows it. Bound collection
cardinality, nesting depth, decompressed size, field length, batch size, and
processing time.

Use a maintained parser configured securely for the format. Do not enable
dangerous entity resolution, object construction, polymorphic types, arbitrary
class tags, or recursive expansion unless the task requires and contains them.

Treat parsing and validation as different steps. Successful parsing proves
representation, not business correctness.

## Validate syntax and meaning

Apply both:

- **Syntactic validation:** shape, type, required fields, format, encoding,
  length, range, precision, cardinality, and allowed values.
- **Semantic validation:** cross-field relationships, resource existence,
  lifecycle state, business limits, tenant ownership, and whether the requested
  operation is meaningful.

Use positive allowlists for fixed choices, field names, sort keys, operations,
algorithms, destinations, and other enumerated capabilities. A denylist of
known-dangerous strings is not a primary validation strategy.

Make coercion explicit. Distinguish missing, null, empty, zero, false, invalid,
and defaulted values. Do not let permissive truthiness or parser coercion turn a
malformed value into a different valid request.

## Place validation at the responsible layer

- **Transport or ingestion:** Validate representation, basic bounds, content
  type, required shape, and safe parsing.
- **Application or domain:** Validate authorization, relationships, current
  state, cross-field rules, and business invariants.
- **Persistence:** Enforce durable integrity with supported constraints,
  versions, checks, and atomic operations.
- **Output boundary:** Validate or shape data before sending it to another
  system when its contract matters.

Do not place all business rules in a request schema. Do not rely on application
checks alone for invariants that concurrent writers can violate.

## Define normalization and unknown-field policy

Normalize only when the product defines equivalent representations. Document
whether normalization occurs before comparison, uniqueness, signing, hashing,
authorization, or storage. Be cautious with Unicode, case folding, whitespace,
URLs, paths, timestamps, locale-sensitive numbers, and identifiers.

Choose unknown-field behavior deliberately:

- reject for strict commands or security-sensitive input;
- ignore for tolerant public readers when compatibility requires it; or
- preserve for forwarding or round-trip formats when the contract says so.

Version persisted, queued, or long-lived schemas when producers and consumers
can be deployed independently. Validate old data when it re-enters a current
workflow.

Read
[references/files-text-and-structured-input.md](references/files-text-and-structured-input.md)
before validating Unicode text, regular expressions, URLs, filesystem paths,
uploads, archives, documents, or untrusted structured payloads.

## Keep validation separate from other controls

Validation does not replace:

- authentication or object-, operation-, and property-level authorization;
- parameterized database queries;
- context-specific HTML, JavaScript, CSS, shell, or URL encoding;
- safe command construction and capability allowlists;
- malware scanning or sandboxing;
- cryptographic signature verification; or
- output redaction and data minimization.

Avoid a generic "sanitize" function that mutates data without a precise
destination-specific contract. Preserve legitimate free-form input and encode
it safely at the output sink.

## Treat server validation as authoritative

Use client-side validation for immediate, accessible feedback and to reduce
mistakes. Repeat authoritative validation at the trusted server or execution
boundary because clients can be modified or bypassed.

Do not trust hidden fields, disabled controls, client-calculated prices,
ownership identifiers, roles, scopes, or allowed option lists. Derive
authoritative values from server-side identity and state.

## Return useful but safe failures

Return stable validation codes and precise field or item paths when they help
the caller correct input. Keep messages actionable and avoid echoing secrets,
entire payloads, parser internals, schema implementation details, or dangerous
content.

Cap the number and size of reported issues. For security-sensitive checks, do
not reveal distinctions that create an account, identifier, signature, or
authorization oracle.

Log or count unusual validation failures when they indicate abuse or contract
drift, while controlling cardinality and sensitive data.

## Verify boundary behavior

Test:

- missing, null, empty, zero, false, and defaulted values;
- minimum, maximum, just-inside, and just-outside bounds;
- unexpected fields, duplicate keys, invalid types, and ambiguous encodings;
- invalid individual fields and invalid combinations;
- Unicode normalization, confusables, and malformed sequences where relevant;
- excessive bytes, collections, nesting, expansion, and processing time;
- authorization and tenant changes after syntactic validation;
- old schema versions and malformed dependency responses;
- safe error codes, paths, caps, and redaction; and
- property-based or fuzz cases for parsers and security-sensitive boundaries.

Run relevant tests, static checks, and the build. Exercise the real parser and
boundary integration when possible. Report any format, size, encoding, or
adversarial case that was not verified.
