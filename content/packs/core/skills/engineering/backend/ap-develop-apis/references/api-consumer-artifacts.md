# API consumer artifacts

## Contents

- Keep one contract with three views
- Build an external Postman collection
- Write the external API guide
- Write the internal API guide
- Update and verify artifacts

## Keep one contract with three views

Use each artifact for a different job:

- **OpenAPI or equivalent:** Machine-readable operations, schemas, security,
  responses, and compatibility contract.
- **Postman collection:** Runnable requests, variables, examples, and useful
  consumer workflows for an external API.
- **API guide:** Human onboarding, concepts, task-oriented usage, and
  operational expectations.

Choose one generation or update direction and keep it repeatable. When the
repository generates a collection from OpenAPI, update the source contract and
run the established generator rather than hand-editing generated output. When
artifacts are maintained manually, compare paths, methods, authentication,
parameters, bodies, status codes, examples, and error behavior in the same
change.

Do not duplicate exhaustive schema definitions in prose. Link to the
machine-readable contract and explain how developers actually use it.

## Build an external Postman collection

Store collections under the repository-root `postman/` directory. Preserve
existing filenames and organization. For a new collection, use a descriptive
`<api-name>.postman_collection.json` filename.

Use the current official Postman Collection schema supported by the
repository's tooling. Postman's current collection API documents the
[v2.1 schema format](https://learning.postman.com/api-docs/api-reference/collections/create-collection);
verify current official guidance when creating or upgrading a collection.

Make the collection usable by a developer who did not build the API:

- Include every supported external operation in a resource- or
  workflow-oriented folder.
- Give the collection, folders, requests, parameters, and non-obvious headers
  concise descriptions.
- Use variables such as `{{baseUrl}}`, `{{accessToken}}`, and representative
  resource identifiers.
- Define authentication at the highest correct collection or folder level.
- Keep secret variable values empty. Never commit credentials, session values,
  private keys, sensitive production identifiers, or real customer data.
- Include realistic request bodies and saved success and important error
  examples without fabricating supported behavior.
- Preserve content types, version headers, idempotency keys, pagination,
  conditional requests, and other contract-relevant headers.
- Add stable lightweight assertions when they make the collection useful as a
  smoke test; do not duplicate the full automated test suite.
- Avoid pre-request scripts that hide essential setup or send undocumented
  requests. Keep necessary scripts small and explained.

Postman can derive documentation from request metadata and examples, so useful
descriptions and examples improve both execution and understanding. See
[Postman's collection documentation guidance](https://learning.postman.com/docs/publishing-your-api/document-a-collection)
and [saved examples](https://learning.postman.com/docs/use/send-requests/response-data/examples).

If environments are necessary, store sanitized environment templates under
`postman/` with empty secrets and document how developers populate them.

## Write the external API guide

Maintain `docs/API_GUIDE.md` for external consumers. Keep it readable from top
to bottom and include the relevant portions of:

1. **Purpose and audience:** What the API enables and who it is supported for.
2. **Quick start:** Minimum steps to make one successful request.
3. **Environments and base URLs:** Production, sandbox, versioning, and region
   behavior when applicable.
4. **Authentication:** How credentials are obtained and sent, token scopes,
   expiry, and safe handling.
5. **Core concepts:** Resource model, identifiers, lifecycle, terminology, and
   important invariants.
6. **Task-oriented workflows:** Common sequences with concise requests and
   responses; do not merely restate an endpoint list.
7. **Conventions:** Content types, timestamps, money, pagination, filtering,
   sorting, idempotency, concurrency, rate limits, and retries as applicable.
8. **Errors:** Stable format, important codes, recovery, and request IDs.
9. **Async behavior and webhooks:** Status polling, delivery, signatures,
   retries, ordering, and deduplication where relevant.
10. **Tools and references:** OpenAPI location, Postman collection, SDKs, and
    generated client guidance.
11. **Compatibility and support:** Deprecation, changelog or release policy,
    support path, and known environment differences.

Use runnable, sanitized examples. Do not include undocumented endpoints,
promises, credentials, fabricated limits, or implementation details consumers
cannot rely on.

## Write the internal API guide

Maintain `docs/INTERNAL_API_GUIDE.md` for project-owned consumers. Include:

- purpose, owning component, and current consumers;
- local, test, and deployed base URLs or service discovery;
- trust boundary, authentication, service identity, and authorization;
- supported operations and task-oriented integration flows;
- request, response, error, async, retry, and idempotency behavior;
- generated client or shared-schema usage;
- local development, test fixtures, and integration-test commands;
- compatibility expectations and deployment ordering; and
- owner or escalation path for contract changes.

Internal does not mean informal. State which behaviors are stable and which are
implementation details. Include enough context for another developer or agent
to change a consumer safely, but link to code and schemas rather than copying
large definitions.

Do not expose internal-only operations in `docs/API_GUIDE.md` or the external
Postman collection.

## Update and verify artifacts

For a consumer-visible change, check all affected artifacts for:

- operation path and method;
- request fields, validation, defaults, and examples;
- response fields and status codes;
- authentication and authorization;
- errors and recovery;
- pagination, idempotency, concurrency, rate limits, and retries;
- lifecycle or workflow changes;
- versioning and deprecation; and
- environment or base URL changes.

Validate Postman JSON against its declared schema or import it with available
tooling. Run representative collection requests when a safe environment and
credentials are available. Never claim a live collection run when only JSON
syntax or schema was checked.

Check every link and command in the relevant guide. Prefer a small automated
drift check between OpenAPI and Postman when the repository can support it.
