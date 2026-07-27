# Migrate, observe, and test

Use this reference for AI SDK upgrades, V6-to-V7 changes, telemetry, DevTools,
performance investigation, or test strategy.

## Contents

- [Migrate from evidence](#migrate-from-evidence)
- [Apply the V7 breaking-change checklist](#apply-the-v7-breaking-change-checklist)
- [Review behavioral changes, not only names](#review-behavioral-changes-not-only-names)
- [Instrument deliberately](#instrument-deliberately)
- [Test deterministically before calling a provider](#test-deterministically-before-calling-a-provider)
- [Verify the completed change](#verify-the-completed-change)

## Migrate from evidence

1. Start from a clean or committed baseline.
2. Inventory all `ai` and `@ai-sdk/*` packages, providers, framework adapters,
   custom wrappers, persisted messages, stream consumers, tests, and runtime
   constraints.
3. Read the installed docs and the official V7 migration guide.
4. Upgrade related packages together using the repository's package manager.
5. Run `npx @ai-sdk/codemod v7` when appropriate, then review every edit. A
   codemod is a starting point, not verification.
6. Search manually for removed, deprecated, provider-specific, and behavioral
   patterns the codemod cannot decide.
7. Typecheck and test after each coherent migration slice.

Do not combine a major SDK migration with an unrelated agent redesign unless
the old architecture prevents a safe upgrade. Preserve behavior first, then
improve it in a separate, reviewable change.

AI SDK 7 requires Node.js 22 or later and ESM. Confirm the deployment platform,
test runner, scripts, package exports, and any CommonJS consumers before
changing module configuration. Prefer an actively supported production Node.js
release allowed by the repository.

## Apply the V7 breaking-change checklist

Search for these V6 patterns and migrate those that exist:

| V6 or deprecated form | V7 form |
| --- | --- |
| `system` option | `instructions` |
| system role inside untrusted `messages` | trusted top-level `instructions` |
| `stepCountIs` | `isStepCount` |
| `onFinish` / `onStepFinish` | `onEnd` / `onStepEnd` |
| `experimental_onStart` / `experimental_onStepStart` | `onStart` / `onStepStart` |
| `experimental_onToolCallStart` / `experimental_onToolCallFinish` | `onToolExecutionStart` / `onToolExecutionEnd` |
| `experimental_prepareStep` | `prepareStep` |
| `experimental_activeTools` | `activeTools` |
| `experimental_output` | `output` |
| `experimental_include` | `include` |
| `includeRawChunks` | `include.rawChunks` |
| `fullStream` | `stream` |
| tool `experimental_context` | tool `context` |
| shared `context` | `runtimeContext` plus scoped `toolsContext` |
| tool `needsApproval` | call or agent `toolApproval` |
| `ToolCallOptions` | `ToolExecutionOptions` |
| `isToolOrDynamicToolUIPart` | `isToolUIPart` |
| result response helper methods | top-level stateless stream helpers |
| `experimental_telemetry` | `telemetry` |
| built-in OpenTelemetry spans | registered `@ai-sdk/otel` integration |

Also inspect renamed stable image, speech, transcription, custom provider,
Google provider, usage detail, and content-part APIs when the repository uses
them. Use the official guide for exact types.

## Review behavioral changes, not only names

The most dangerous migration issues compile successfully:

- `prepareStep` instruction and message overrides now carry forward;
- system messages in prompt arrays are rejected by default;
- `onChunk` receives all stream part types;
- top-level usage and content-like result properties aggregate all steps;
- final-step-only metadata moved to `finalStep`;
- individual `step.response.messages` no longer accumulate earlier steps;
- request and response bodies are excluded unless enabled with `include`;
- telemetry becomes opt-out after a global integration is registered;
- provider-specific reasoning options override top-level `reasoning`;
- MCP HTTP redirects are rejected by default; and
- some provider entry points or defaults changed.

For each affected code path, decide whether the product expects new V7 behavior
or preservation of the prior behavior. Encode that decision in tests.

Update exhaustive message and content-part handling for canonical V7 file
parts and `reasoning-file`. Migrate deprecated image and file variants using the
exact current types instead of casting around errors.

## Instrument deliberately

Register integrations once at startup:

```ts
import { registerTelemetry } from 'ai';
import { OpenTelemetry } from '@ai-sdk/otel';

registerTelemetry(new OpenTelemetry());
```

Once registered, V7 emits telemetry by default. Use `telemetry.functionId` for
stable operation names and set `isEnabled: false` for calls that must opt out.
Disable input or output recording when privacy, security, transfer cost, or
payload size requires it.

Context is excluded from telemetry unless allowlisted. Include only low-risk,
useful fields such as a correlation ID. Never include credentials, access
tokens, approval secrets, raw private tool context, or unnecessary personal
identifiers.

Capture:

- model and provider;
- latency to first token and total duration;
- step and tool duration;
- stop or finish reason;
- input, output, cache, and reasoning token usage;
- retry, timeout, abort, denial, and error classification; and
- product outcome signals that can be measured without storing sensitive text.

Use DevTools for local debugging only. Confirm how and where it stores captures,
exclude it from production startup, and avoid using it with confidential data
unless the user explicitly accepts the exposure.

## Test deterministically before calling a provider

Use `MockLanguageModelV4` and stream simulation utilities from `ai/test` for
repeatable unit and protocol tests. Match the mock interface version exported
by the installed SDK.

Separate tests by boundary:

- pure application services and tool use cases without AI SDK;
- tool schemas, context, output shaping, authorization, and idempotency;
- agent orchestration with deterministic model steps and tool calls;
- structured output parsing and invalid output;
- UI stream conversion, message validation, persistence, and rendering;
- approval request, signed continuation, approve, deny, replay, and tamper;
- telemetry field allowlists and disabled recording; and
- one optional live-provider smoke test that is explicitly gated by credentials.

Never make the normal unit suite depend on model nondeterminism, network access,
or a billable API. For live evaluations, define the dataset, rubric, model,
sampling settings, budget, and acceptable variance.

## Verify the completed change

Run:

1. dependency installation or lockfile validation;
2. the repository's type checker;
3. targeted unit and integration tests;
4. lint or static analysis;
5. the production build; and
6. focused runtime smoke tests for every changed provider, tool, approval, or
   stream boundary that the environment permits.

During a V7 migration, explicitly exercise:

- a single-step generation;
- a multi-step generation and final-step access;
- structured output;
- a tool success and failure;
- manual approval continuation when present;
- UI streaming and abort behavior;
- persisted history replay; and
- telemetry startup with sensitive-field inspection.

Inspect the final diff for deprecated aliases, casts added to silence type
errors, accidental request or response body capture, client-side secrets, and
unbounded loops. Report every important path that could not be executed.

Official references:

- https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0
- https://ai-sdk.dev/docs/ai-sdk-core/testing
- https://ai-sdk.dev/docs/ai-sdk-core/telemetry
- https://ai-sdk.dev/docs/ai-sdk-core/devtools
- https://vercel.com/blog/ai-sdk-7
