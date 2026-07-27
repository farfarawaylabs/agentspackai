# Core architecture and generation

Use this reference when choosing AI SDK packages, providers, generation APIs,
agent abstractions, reasoning, structured output, or durable execution.

## Contents

- [Choose packages and providers deliberately](#choose-packages-and-providers-deliberately)
- [Select the orchestration boundary](#select-the-orchestration-boundary)
- [Use current V7 generation patterns](#use-current-v7-generation-patterns)
- [Design structured output](#design-structured-output)
- [Build retrieval as a measurable pipeline](#build-retrieval-as-a-measurable-pipeline)
- [Bound reasoning and multi-step work](#bound-reasoning-and-multi-step-work)
- [Escalate to durable or experimental capabilities carefully](#escalate-to-durable-or-experimental-capabilities-carefully)

## Choose packages and providers deliberately

Install only the packages required by the selected architecture:

- `ai` for core generation, agents, tools, embeddings, reranking, and stream
  helpers;
- `@ai-sdk/<provider>` for direct provider clients, native authentication, and
  provider-specific models, options, or tools;
- `@ai-sdk/react`, `@ai-sdk/vue`, `@ai-sdk/svelte`, or another matching UI
  package for the repository's framework;
- `@ai-sdk/mcp` only for Model Context Protocol clients;
- `@ai-sdk/workflow` only for durable `WorkflowAgent` execution;
- `@ai-sdk/otel` only when OpenTelemetry spans are required; and
- `@ai-sdk/devtools` only as a local development dependency when its captures
  are acceptable.

Use the Vercel AI Gateway when centralized credentials, unified model access,
budgets, observability, fallbacks, or provider portability fit the product.
Use a direct provider package when the repository already owns that integration
or needs provider-native authentication, controls, tools, response metadata, or
features. Gateway is a useful default for some projects, not an invariant.

Do not invent a model identifier. Inspect the current Gateway model list,
provider documentation, or repository configuration. Make model selection
configurable when operators need to change models independently of deployment.

## Select the orchestration boundary

Choose based on lifecycle, not on which API appears most sophisticated:

| Need | Prefer |
| --- | --- |
| One response or validated object | `generateText` |
| Incremental response or event processing | `streamText` |
| Reusable bounded model-tool loop | `ToolLoopAgent` |
| Restart-safe, deploy-safe, or long-running agent work | `WorkflowAgent` |
| Established coding harness through AI SDK | Experimental `HarnessAgent` |

Put reusable agent definitions in server-side modules. Keep request-specific
identity, permissions, tenant data, correlation IDs, and secrets in call
context rather than module globals or prompts.

Use `callOptionsSchema` and `prepareCall` when a reusable agent needs a narrow,
typed set of request-specific controls. Validate caller-supplied options, then
translate them into agent settings and context. Do not expose arbitrary model,
tool, prompt, or approval configuration as user-controlled call options.

Avoid a single universal agent with every tool. Create capability-focused
agents and expose only the tools needed for the current task. Use subagents only
when specialization or context isolation justifies the extra model calls and
failure modes.

## Use current V7 generation patterns

A representative bounded V7 agent shape is:

```ts
import { ToolLoopAgent, isStepCount } from 'ai';

export const supportAgent = new ToolLoopAgent({
  model,
  instructions: 'Resolve support questions using verified account data.',
  tools,
  stopWhen: isStepCount(8),
  prepareStep: ({ steps, runtimeContext }) => {
    return {
      activeTools: chooseTools(steps, runtimeContext),
    };
  },
});
```

Verify the exact constructor and callback types in the installed package before
adapting this shape. Prefer `instructions`, `isStepCount`, `prepareStep`,
`activeTools`, `onStart`, `onStepStart`, `onStepEnd`, and `onEnd` in V7.

For `streamText`, consume `result.stream` rather than the deprecated
`fullStream`. V7 `onChunk` receives every stream part, so narrow on
`chunk.type` before accessing part-specific fields.

V7 result properties such as `usage`, `content`, `toolCalls`, `toolResults`,
`files`, `sources`, and `warnings` aggregate all steps. Use `finalStep` when the
caller specifically needs only the last step. Use `responseMessages` when the
caller needs accumulated response history; individual
`step.response.messages` contain only that step.

## Design structured output

Use a current `Output` helper when the application needs data rather than prose:

```ts
import { generateText, Output } from 'ai';
import { z } from 'zod';

const result = await generateText({
  model,
  instructions: 'Extract facts only when supported by the source.',
  prompt: source,
  output: Output.object({
    schema: z.object({
      title: z.string(),
      facts: z.array(z.string()),
    }),
  }),
});

const value = result.output;
```

Treat schemas as product contracts:

- reject invalid states instead of making every property optional;
- describe fields whose intended meaning is not obvious;
- set reasonable lengths and collection bounds;
- distinguish missing, unknown, and empty values;
- validate again at the application boundary before a side effect; and
- test malformed and semantically wrong model outputs.

Do not request structured output merely to parse a sentence. Do not treat schema
validation as factual validation.

## Build retrieval as a measurable pipeline

Keep ingestion, chunking, embedding, storage, candidate retrieval, reranking,
context assembly, and generation as separable stages. This makes quality and
cost measurable and lets one model or store change without rewriting the
entire feature.

Use AI SDK embedding and reranking APIs only after checking the selected
provider's current model, dimensions, limits, batching, and score semantics.
Store the embedding model and content-version metadata needed to detect stale
vectors and re-embed safely.

Retrieve a broad but bounded candidate set, apply authorization and tenant
filters before exposing content, then rerank when it produces measurable
quality gains. Do not treat scores from different rerankers as interchangeable
or rely on a remembered absolute threshold.

Evaluate retrieval separately from answer generation. Include empty results,
near duplicates, stale documents, adversarial content, permission boundaries,
and queries whose answer is absent.

## Bound reasoning and multi-step work

Use the V7 top-level `reasoning` option for provider-agnostic reasoning control.
Verify supported values for the selected provider and model. Remove overlapping
reasoning settings from `providerOptions` unless the provider-specific override
is deliberate; provider-specific settings take precedence.

Budget more than step count:

- total and per-step time;
- tool and provider timeouts;
- token or cost ceilings;
- tool output size;
- retries and retryable errors; and
- concurrency and rate limits.

An agent should stop with a useful partial result or explicit failure when it
cannot finish safely within budget. Never let the model decide its own
unbounded execution policy.

## Escalate to durable or experimental capabilities carefully

Use `WorkflowAgent` when the process must pause and resume across restarts,
deployments, or delayed approvals. Keep workflow steps replay-safe and side
effects idempotent. Persist the minimum state needed to resume, and version
workflow inputs that may outlive a deployment.

AI SDK 7 also introduces experimental harness, realtime, video, MCP Apps, file
and skill upload, and sandbox capabilities. Before adoption:

1. Verify the API in the installed packages and current official docs.
2. Confirm provider and deployment support.
3. Document the experimental status and fallback.
4. Isolate the feature behind an application-owned interface.
5. Test resource cleanup, cancellation, authorization, and failure recovery.

Do not redesign a stable application around an experimental feature merely
because it is new.

Official references:

- https://ai-sdk.dev/docs
- https://ai-sdk.dev/docs/agents
- https://ai-sdk.dev/docs/ai-sdk-core/reasoning
- https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
- https://ai-sdk.dev/docs/agents/workflow-agent
