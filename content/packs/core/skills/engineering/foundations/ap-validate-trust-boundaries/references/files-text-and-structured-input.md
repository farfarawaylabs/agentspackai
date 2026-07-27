# Files, text, and structured input

Use this reference for formats whose safe validation requires more than a
simple object schema.

## Contents

- [Handle text and Unicode deliberately](#handle-text-and-unicode-deliberately)
- [Use regular expressions safely](#use-regular-expressions-safely)
- [Validate URLs and filesystem paths by capability](#validate-urls-and-filesystem-paths-by-capability)
- [Treat uploads and archives as hostile containers](#treat-uploads-and-archives-as-hostile-containers)
- [Constrain structured data and parser features](#constrain-structured-data-and-parser-features)
- [Validate upstream and persisted data](#validate-upstream-and-persisted-data)

## Handle text and Unicode deliberately

Decide what the field represents before restricting characters. Human names,
addresses, and prose require different policies from identifiers, filenames,
hostnames, or protocol tokens.

For free-form human text:

- accept the scripts and punctuation the product actually supports;
- reject invalid encoding and control characters that have no valid use;
- set byte and character or grapheme limits as appropriate;
- normalize only to a documented Unicode form when equivalence matters;
- preserve the original when display or legal fidelity matters; and
- use destination-specific output encoding rather than deleting punctuation
  that might look dangerous.

For identifiers:

- define the allowed alphabet, case sensitivity, normalization, separators,
  length, and uniqueness semantics;
- beware visually confusable characters and invisible format characters;
- compare the canonical form used by authorization and uniqueness checks; and
- avoid changing canonicalization after identifiers are issued without a
  migration plan.

Do not use byte length as a substitute for user-visible character limits, or
vice versa, without considering the storage and UI contract.

## Use regular expressions safely

Use regex only when it makes the accepted language clearer than a parser or
simple range and character checks.

- Anchor the full value when partial matching is not intended.
- Set an independent input-length limit.
- Avoid nested ambiguous repetition and other catastrophic backtracking
  patterns.
- Prefer a linear-time engine or a reviewed parser for attacker-controlled
  complex text.
- Test worst-case near matches, not only valid examples.
- Keep the expression readable and explain non-obvious constraints.

Do not attempt to fully validate complicated standards such as email, URLs, or
programming languages with an improvised regex when a maintained parser and
task-specific semantic checks are more reliable.

## Validate URLs and filesystem paths by capability

Parse URLs with the platform URL parser, then validate the exact capability:

- allowed schemes;
- whether credentials, fragments, ports, redirects, or internationalized hosts
  are permitted;
- hostname or destination allowlist;
- resolved IP ranges and DNS-rebinding considerations for server-side fetches;
- maximum URL and response size; and
- redirect destination revalidation.

A syntactically valid URL can still target loopback, link-local, metadata,
private, or otherwise forbidden infrastructure.

For filesystem paths:

- select an application-owned root;
- reject absolute paths and traversal when callers should provide descendants;
- resolve and verify containment using filesystem-aware APIs;
- account for symlinks, case behavior, alternate separators, encoded traversal,
  and race conditions;
- generate storage names server-side when user filenames are only labels; and
- use least-privilege filesystem permissions.

String prefix checks alone do not prove containment.

## Treat uploads and archives as hostile containers

For uploads:

- allowlist necessary extensions and detected content types;
- inspect file signatures or parse with a trusted library rather than trusting
  the client header;
- cap bytes, dimensions, pages, entries, and processing time;
- generate safe storage names and store outside executable or public roots;
- scan for malware or dangerous active content when risk warrants it;
- strip or preserve metadata according to the product and privacy contract;
- serve with a safe content type and disposition; and
- quarantine until validation finishes when processing is asynchronous.

For archives and compressed documents:

- cap compressed and expanded sizes, ratios, entry counts, and nesting;
- reject absolute, parent-traversing, device, link, and duplicate-conflict
  entries;
- extract into a newly created contained directory;
- avoid overwriting existing files;
- reject unexpected executable or active content; and
- clean partial output on failure.

Validation should establish both that the file is structurally valid and that
the application is willing to process its capabilities.

## Constrain structured data and parser features

For JSON, YAML, XML, CSV, protocol buffers, and similar formats:

- set byte, nesting, collection, string, and number limits;
- define duplicate-key behavior;
- reject non-finite or out-of-range numbers when the domain cannot represent
  them;
- disable external entities and implicit network or filesystem access;
- disable arbitrary object, class, tag, or code construction;
- define unknown-field and schema-version behavior;
- validate discriminated variants and cross-field rules;
- handle CSV formula injection when exporting data to spreadsheet software; and
- verify signatures against the exact raw representation before parsing when
  the protocol requires it.

Do not parse and reserialize a signed webhook before verifying its signature.
Do not assume a parser's permissive default matches the public contract.

## Validate upstream and persisted data

Treat dependency responses, cache entries, database rows, events, and files as
untrusted when they can be malformed by:

- a compromised or buggy producer;
- version skew;
- manual operations;
- partial migrations;
- stale cache schemas;
- corruption; or
- historical code that enforced different rules.

Validate at the point where current code depends on the data's shape or
meaning. Decide whether malformed data should fail the operation, fall back,
quarantine the record, skip one item with a reported partial result, or trigger
repair. Never silently coerce corrupted authoritative data into a plausible but
wrong value.

Official references:

- https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html
