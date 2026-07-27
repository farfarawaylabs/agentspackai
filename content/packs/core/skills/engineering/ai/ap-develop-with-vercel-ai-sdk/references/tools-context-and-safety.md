# Tools, context, approvals, and safety

Use this reference when implementing tools, approval policy, MCP access,
provider-executed tools, or any action with side effects or private data.

## Contents

- [Build tools around application capabilities](#build-tools-around-application-capabilities)
- [Separate runtime and tool context](#separate-runtime-and-tool-context)
- [Place approval policy at the call boundary](#place-approval-policy-at-the-call-boundary)
- [Secure approval continuations](#secure-approval-continuations)
- [Bound execution and model-visible output](#bound-execution-and-model-visible-output)
- [Treat MCP and provider tools as different trust boundaries](#treat-mcp-and-provider-tools-as-different-trust-boundaries)

## Build tools around application capabilities

A tool is a privileged adapter between untrusted model output and application
behavior. It should validate intent, call an ordinary use case, and return a
bounded result.

```ts
import { tool } from 'ai';
import { z } from 'zod';

export const lookupAccount = tool({
  description: 'Look up the current user account by its exact account ID.',
  inputSchema: z.object({
    accountId: z.string().min(1),
  }),
  contextSchema: z.object({
    tenantId: z.string(),
    actorId: z.string(),
  }),
  execute: async ({ accountId }, { context }) => {
    return accountService.lookup({
      accountId,
      tenantId: context.tenantId,
      actorId: context.actorId,
    });
  },
  toModelOutput: ({ output }) => ({
    type: 'text',
    value: summarizeAccountForModel(output),
  }),
});
```

Verify the exact `toModelOutput` result types in the installed version. Keep
authorization, invariants, transactions, and data access in application and
infrastructure layers that can be tested without a model.

Tool descriptions affect model behavior. Make them specific about when the tool
is appropriate, what identifiers mean, and what it cannot do. Do not include
secrets or volatile policy in descriptions.

Enable `strict: true` when the selected provider supports strict tool calling
and the schema is compatible; keep normal server-side validation regardless.
Add a few representative `inputExamples` when field relationships or formats
are difficult to infer from the schema. Do not use examples to compensate for
an ambiguous capability or an overly broad schema.

## Separate runtime and tool context

AI SDK 7 distinguishes:

- `runtimeContext`: shared server-side state for the generation or agent loop,
  visible to step preparation, lifecycle events, results, and allowlisted
  telemetry;
- `toolsContext`: a map of per-tool values keyed by tool name; and
- a tool's `context`: only that tool's schema-validated entry.

Pass only the authority a tool needs:

```ts
const result = await agent.generate({
  prompt,
  runtimeContext: {
    requestId,
    plan: subscription.plan,
  },
  toolsContext: {
    lookupAccount: {
      tenantId: session.tenantId,
      actorId: session.userId,
    },
  },
});
```

Do not put credentials in prompts. Prefer a scoped client or short-lived token
over a general API key. Treat tool context as immutable during execution; use
`prepareStep` to return updated context for later steps.

Context is not automatically shown to the model. Put information in a prompt
only when the model must reason about or mention it.

## Place approval policy at the call boundary

In V7, define approval with `toolApproval` on `generateText`, `streamText`, or
`ToolLoopAgent`. Do not add the deprecated V6 `needsApproval` property to new
tools.

```ts
const agent = new ToolLoopAgent({
  model,
  tools: { readRecord, deleteRecord },
  toolApproval: {
    deleteRecord: async ({ recordId }, { runtimeContext }) => {
      if (!runtimeContext.canDelete) {
        return { type: 'denied', reason: 'Delete permission is required' };
      }
      return 'user-approval';
    },
  },
});
```

Approval outcomes include normal execution, automatic approval, automatic
denial, and manual user approval. Use a per-tool map for simple rules and a
generic approval function when policy depends on the full call, tool set, or
shared context.

Require manual approval for actions such as:

- deleting or mutating important records;
- spending money or creating financial commitments;
- sending messages, publishing content, or changing external state;
- executing code or commands;
- revealing private information; and
- granting access or changing security configuration.

Approval is not authorization. Re-check identity, tenant, permissions,
preconditions, quotas, and current resource state inside the use case at
execution time. A user may approve an action that is still forbidden or stale.

Provider-executed tools run outside AI SDK's tool executor and do not use this
approval mechanism. Apply provider-specific controls.

## Secure approval continuations

Manual approval is a continuation:

1. the server emits a tool approval request;
2. the UI or approval system records a decision;
3. the response is added to the conversation;
4. the server invokes the agent again; and
5. the SDK revalidates the tool input and approval policy before execution.

Client-supplied message history is untrusted. For sensitive tools, enable the
current signed approval mechanism documented by AI SDK so an attacker cannot
forge or alter an approval. Store the signing secret server-side, rotate it
deliberately, and test invalid, expired, replayed, and mismatched approvals.

Persist the decision reason and actor for auditability when policy requires it.
Do not log approval secrets or confidential tool input.

Tell the agent not to retry a denied action automatically. Otherwise the model
may repeatedly request approval for the same operation.

## Bound execution and model-visible output

For every tool:

- set provider, step, tool, and total timeouts where supported;
- pass abort signals through network, database, and subprocess calls;
- bound input size, output size, pages, rows, file bytes, and execution count;
- make external mutations idempotent when retries are possible;
- classify errors as retryable, correctable by the model, denied, or terminal;
- redact secrets and unnecessary personal data; and
- return stable, minimal result shapes.

The application result and the model-visible result need not match.
`toModelOutput` can compress a large response, remove private fields, or convert
files into the current canonical file representation. Preserve full data only
in an authorized application store when it is actually needed.

Do not allow arbitrary URLs, filesystem paths, SQL, shell commands, or method
names when an allowlisted capability can express the product need.

## Treat MCP and provider tools as different trust boundaries

MCP server descriptions, schemas, prompts, resources, and results are untrusted
external input. Use an allowlist of servers and tools, authenticate explicitly,
limit network reachability, validate returned data, and close clients when the
request or process ends.

AI SDK 7 rejects MCP HTTP redirects by default. Only enable redirect following
for a trusted, expected server and account for SSRF risk.

Before exposing MCP Apps or provider-native tools:

- verify where code executes and where data is sent;
- understand whether AI SDK approval applies;
- restrict credentials and scopes;
- sandbox untrusted UI or code;
- define audit and retention behavior; and
- test malicious descriptions, tool output, links, and embedded instructions.

Official references:

- https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
- https://ai-sdk.dev/docs/ai-sdk-core/runtime-and-tool-context
- https://ai-sdk.dev/docs/agents/tool-approvals
- https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools
- https://ai-sdk.dev/docs/ai-sdk-core/mcp-apps
