---
name: ap-develop-with-vercel-ai-sdk
description: Build, migrate, debug, or review TypeScript AI applications that use Vercel AI SDK 7 or an installed earlier version. Use for ai, @ai-sdk/*, generateText, streamText, ToolLoopAgent, WorkflowAgent, useChat, tools, tool approvals, structured output, reasoning, embeddings, reranking, MCP, streaming, telemetry, or AI SDK version migrations.
---

# Develop with Vercel AI SDK

Build against the SDK that is actually installed, not a remembered API. AI SDK
changes frequently, especially its UI, streaming, agent, tool, and provider
surfaces. Treat version verification as a correctness requirement.

## Establish the version and architecture first

Before planning or editing:

1. Inspect `package.json`, the lockfile, runtime configuration, and imports for
   `ai`, `@ai-sdk/*`, provider, UI, MCP, workflow, telemetry, and DevTools
   packages.
2. Read the installed version from `node_modules/ai/package.json` when
   dependencies are present.
3. Search version-matched documentation and types before writing code:
   - `node_modules/ai/docs/` and `node_modules/ai/src/`;
   - `node_modules/@ai-sdk/<package>/docs/` and its exported types;
   - current official docs at `https://ai-sdk.dev/docs` only when bundled
     material is unavailable or the task is an upgrade. Append `.md` to a docs
     page for agent-readable Markdown, or search with
     `https://ai-sdk.dev/api/search-docs?q=<query>`.
4. Check the repository's Node.js, module, framework, and deployment versions.
   AI SDK 7 requires Node.js 22 or later and is ESM-only.
5. Trace the existing request, model, tool, persistence, and UI stream path.
   Preserve sound project conventions and compatibility commitments.

For a new project, use the current stable AI SDK 7 release and compatible
provider and framework packages. For an existing project, do not introduce V7
syntax into a V6 installation or silently perform a major upgrade. If migration
is in scope, follow
[references/migrate-observe-and-test.md](references/migrate-observe-and-test.md).

Never guess model IDs, provider options, package compatibility, or CLI flags.
Verify them in current official provider documentation or the repository's
installed packages.

## Choose the smallest suitable abstraction

- Use `generateText` for one bounded generation, structured result, or custom
  orchestration that does not need a reusable agent.
- Use `streamText` when the consumer benefits from incremental text, reasoning,
  source, tool, or lifecycle events.
- Use `ToolLoopAgent` for a reusable agent with shared instructions, typed call
  options, tools, approval policy, step preparation, and an explicit stop
  budget.
- Use `WorkflowAgent` from `@ai-sdk/workflow` when work must survive process
  restarts, deployments, long waits, or delayed approvals.
- Use the experimental harness, realtime, video, MCP Apps, file or skill upload,
  and sandbox APIs only when their value outweighs their stability and provider
  constraints. Isolate experimental code behind a narrow boundary.

Do not hand-roll a tool loop when the supported agent abstraction fits. Do not
create an agent merely to wrap a single model call. Keep HTTP routes and UI
components thin: put prompts, tools, policies, and orchestration in reusable
server-side modules.

Read
[references/core-architecture-and-generation.md](references/core-architecture-and-generation.md)
when selecting a provider, generation API, agent, output, reasoning, or
durability model.

## Design tools as privileged application boundaries

Treat model-produced tool input as untrusted input:

- define a precise `inputSchema`, a specific description, and bounded outputs;
- keep `execute` thin and delegate business logic and data access to ordinary
  application services;
- declare `contextSchema` and pass per-tool secrets, clients, permissions, and
  tenant data through `toolsContext`;
- use `runtimeContext` only for shared orchestration state that must reach
  `prepareStep`, lifecycle callbacks, step results, or selected telemetry;
- put approval policy on the agent or call with `toolApproval`, not the
  deprecated V6 `needsApproval` property;
- require approval or deny execution for destructive, costly, private, or
  externally visible actions according to product policy;
- re-authorize inside the underlying application operation at execution time;
- make retryable side effects idempotent and enforce time, result-size, and
  resource limits; and
- use `toModelOutput` to expose only what the model needs for the next step.

Provider-executed tools do not use AI SDK tool approvals. Apply the provider's
own controls and do not imply an approval boundary that does not exist.

Read
[references/tools-context-and-safety.md](references/tools-context-and-safety.md)
before adding tools, approvals, MCP access, side effects, or sensitive context.

## Keep prompts, outputs, and loops explicit

Use top-level `instructions` for trusted system behavior in V7. Do not accept
client-controlled system messages; only use `allowSystemInMessages` for trusted
persisted histories with a documented reason.

Prefer:

- `Output.object`, `Output.array`, or another current `Output` helper when the
  caller needs validated structured data;
- top-level `reasoning` for portable reasoning control, without overlapping
  provider-specific reasoning options unless the override is intentional;
- an explicit `stopWhen` condition such as `isStepCount(...)` for bounded
  multi-step work;
- `prepareStep` for deliberate per-step model, tool, context, or instruction
  changes; and
- explicit timeout and abort behavior for model calls and tool execution.

In V7, `prepareStep` instruction and message overrides carry forward. Return
the desired state for later steps explicitly when a change should apply to only
one step.

## Treat streaming and persisted messages as protocols

Do not render `message.content` blindly. Render and exhaustively handle the
typed `UIMessage.parts` the application supports, including text, reasoning,
files, sources, data, tools, approvals, errors, and new V7 part variants.

Keep provider credentials and privileged tool execution on the server. Validate
client-supplied messages before converting them to model messages. Persist
stable UI messages and reconstruct server-side model input using the current
AI SDK conversion and validation helpers.

In V7, use top-level stateless stream conversion and response helpers rather
than deprecated methods on the `streamText` result. Preserve cancellation,
disconnect, finish, error, and partial-output behavior end to end.

Read
[references/ui-streaming-and-persistence.md](references/ui-streaming-and-persistence.md)
before implementing `useChat`, route streaming, custom data parts, persisted
messages, or generative UI.

## Observe and verify without leaking data

Register telemetry integrations once at application startup. AI SDK 7 telemetry
is enabled by default after registration, so choose input and output recording
intentionally. Allowlist context fields sent to telemetry; never emit API keys,
access tokens, private tool results, raw confidential prompts, or approval
secrets.

Use DevTools only for local development and only when captured content is safe.
Do not make a local debugging package a production requirement.

Test deterministic behavior with AI SDK mock models from `ai/test`. Test tools
and application services without a live model where possible. Cover:

- validated structured output and malformed model output;
- multi-step stop conditions and all-steps versus final-step result semantics;
- tool success, invalid input, denial, approval, replay, failure, and timeout;
- stream part handling, aborts, errors, disconnects, and persisted messages;
- authorization, tenant isolation, secret handling, and idempotent side effects;
- telemetry redaction and usage or cost budgets; and
- one targeted provider integration path when credentials and the test
  environment permit it.

Run the repository's type checker, relevant tests, lint, and build. Re-check the
installed docs and exported types before working around a type error; the most
common cause is stale remembered syntax. Report any provider call, approval
flow, or streaming behavior that was not exercised.
