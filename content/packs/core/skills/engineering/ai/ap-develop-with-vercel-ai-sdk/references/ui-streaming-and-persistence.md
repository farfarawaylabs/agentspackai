# UI, streaming, and persistence

Use this reference when building chat routes, `useChat`, generative UI, custom
data parts, stream handling, message persistence, or approval UI.

## Contents

- [Separate the server and UI contracts](#separate-the-server-and-ui-contracts)
- [Use V7 stateless stream helpers](#use-v7-stateless-stream-helpers)
- [Render typed message parts](#render-typed-message-parts)
- [Validate and persist messages safely](#validate-and-persist-messages-safely)
- [Handle approvals and failures as UI states](#handle-approvals-and-failures-as-ui-states)

## Separate the server and UI contracts

Keep provider calls, API keys, privileged tools, approval policy, and conversion
to model messages on the server. The UI sends user intent and renders a typed
application protocol; it must not become a provider client by accident.

Infer a project-specific UI message type from the agent or define one with the
supported tool and data-part types. Share that type between the server route
and UI package without importing server-only implementations into the client.

Keep route handlers thin:

1. authenticate and authorize the request;
2. parse and validate the submitted UI messages and request options;
3. load trusted server-side conversation or application context;
4. invoke the reusable generation or agent module;
5. convert its event stream to the UI protocol; and
6. persist only after validated lifecycle boundaries.

## Use V7 stateless stream helpers

AI SDK 7 deprecates response methods on the `streamText` result. Compose with
top-level helpers:

```ts
import {
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from 'ai';

const result = streamText({
  model,
  instructions,
  messages,
});

const uiStream = toUIMessageStream({
  stream: result.stream,
  originalMessages,
  onEnd: async ({ messages }) => {
    await persistMessages(messages);
  },
});

return createUIMessageStreamResponse({ stream: uiStream });
```

Verify callback names and persistence arguments in the installed version. Use
`toTextStream` plus `createTextStreamResponse` only when the consumer needs
plain text rather than UI messages.

V7 `onChunk` receives lifecycle and boundary parts in addition to text,
reasoning, source, tool, data, error, abort, and finish parts. Narrow by type.
Do not assume every chunk contains text.

Thread abort signals from the incoming request through generation and tools.
Define what happens on client disconnect: cancel work, continue durable work,
or detach and allow reconnection. Do not leave expensive generation running by
accident.

## Render typed message parts

Render `UIMessage.parts`, not a guessed `message.content` string. Use exhaustive
switches or current type guards for the supported part types.

Account for:

- text and reasoning start, delta, and end states;
- source links and files;
- custom typed data parts;
- tool input streaming, available input, running execution, output, error,
  denial, and approval requests;
- canonical file parts and V7 `reasoning-file` parts;
- provider metadata only when it is intentionally exposed; and
- unknown or newly added parts with a safe fallback and observable warning.

Use current `isToolUIPart` for generic tool-part detection. For statically typed
tools, prefer the specific `tool-<name>` discriminant so the UI receives typed
input and output.

Never render model or tool HTML unsanitized. Treat URLs, citations, filenames,
Markdown, tool errors, and custom data as untrusted.

## Validate and persist messages safely

Persist the application's stable `UIMessage` representation rather than raw
provider requests or responses. Provider formats, transient stream events, and
model IDs can change independently of the product's conversation contract.

On every request:

- validate client-supplied messages with the current AI SDK message validator
  and the application's schemas;
- load authoritative identity, permissions, and tenant state server-side;
- reject client-controlled system messages;
- convert validated UI messages with the current `convertToModelMessages`
  pattern;
- preserve stable IDs and ordering; and
- version custom data parts or persisted records when their schema evolves.

Do not trust persisted content merely because it originated in an earlier
server response. It may have been edited, imported, or created by an older
version.

Persist enough information to resume approval or durable work, but not secrets,
ephemeral credentials, raw telemetry payloads, or provider data with no product
need. Define retention and deletion behavior for prompts, outputs, files, and
tool results.

## Handle approvals and failures as UI states

In `useChat`, manual approval requests appear in tool parts with
`state: 'approval-requested'`. Respond with the current
`addToolApprovalResponse` API and send the next request only after all manual
decisions required by the assistant message are complete.

Show the exact proposed action and material arguments before approval. Distinguish
automatic approval, denial, user denial, execution failure, and model failure.
Prevent double submission and make retry semantics explicit.

Design visible states for:

- submitted and streaming;
- awaiting approval;
- denied or cancelled;
- tool running and tool failed;
- provider or transport error;
- aborted or disconnected;
- partial response available; and
- retry or resume available.

Do not expose raw provider errors or stack traces to users. Preserve a
correlation ID server-side and return a safe, actionable message.

Test the wire protocol and UI reducer with simulated readable streams. Cover
split chunks, out-of-order assumptions, duplicate events, aborts, errors,
approval continuation, reconnection, and persisted-message replay.

Official references:

- https://ai-sdk.dev/docs/ai-sdk-ui/overview
- https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence
- https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol
- https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces
- https://ai-sdk.dev/docs/agents/tool-approvals
