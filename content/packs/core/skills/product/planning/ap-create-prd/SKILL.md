---
name: ap-create-prd
description: Interview the user, challenge product assumptions, shape the narrowest valuable solution, and create or update a concise product requirements document. Use when the user asks to create, write, draft, revise, or be interviewed for a PRD; turn a product or feature idea into requirements; clarify product scope and success; or decide what should be built before technical planning. Do not use for an implementation plan, engineering specification, or market-research report.
---

# Create a PRD

Act as a rigorous product partner, not a transcription service. Extract the
product decision through conversation, challenge weak assumptions, and turn the
agreed direction into a concise document that aligns product, design, and
engineering.

## Orient and preserve context

Treat text supplied with the invocation as the user's initial brief. Do not ask
them to repeat information they already provided.

1. Read applicable repository instructions, existing PRDs, product
   documentation, research, analytics summaries, user evidence, technical
   requirements, and relevant current behavior.
2. Distinguish a new product, a major product change, and a feature within an
   existing product. Preserve the broader product context.
3. Resolve the intended PRD destination:
   - use a user-specified path;
   - otherwise update the applicable existing canonical PRD;
   - otherwise follow the repository's established PRD directory; or
   - default a new product's canonical document to root `PRD.md`.
4. Do not overwrite a broad product PRD with a narrow feature PRD. If multiple
   plausible destinations exist and the choice matters, ask.

Read the repository to answer discoverable questions. Do not interrogate the
user about current code or documented decisions that can be verified directly.

## Interview conversationally

Ask one decision-sized question at a time by default. Use at most two or three
tightly related questions in one turn when the user has already supplied a
detailed brief and batching will not reduce answer quality. Never dump the full
questionnaire.

Start from the largest unresolved product question. Usually establish:

### Problem and evidence

- Who specifically experiences the problem?
- What are they trying to accomplish?
- What do they do today, including manual workarounds or doing nothing?
- What concrete cost, frustration, delay, risk, or missed outcome results?
- What observed behavior, customer evidence, or product data supports the
  problem?
- Why is this worth addressing now?

Interest, praise, a waitlist, or a plausible story is not automatically demand.
Do not turn hypothetical users or unsourced claims into facts.

### Product shape

- What outcome should change for the user?
- What is the simplest complete experience that produces that outcome?
- What is the core user flow?
- Why is this approach better for the target user than the status quo?
- Which premise must be true for the solution to work?
- What credible alternative, smaller intervention, manual process, or
  no-build option should be considered?
- How could the product evolve later without putting speculative platform work
  into the first version?

Force a narrow wedge. A platform vision is not an MVP until it identifies the
first user, painful workflow, and useful end-to-end result.

### Scope and success

- Which capabilities are required for the first valuable release?
- What is deliberately later or out of scope?
- Which dependencies, policies, data, operational realities, accessibility
  needs, privacy concerns, or other constraints materially shape the product?
- What could make the product fail even if it is implemented as described?
- Which observable user outcome and guardrail metrics indicate success?
- What baseline, target, measurement source, and evaluation window are known?
- What must be true for the team to call this version complete?

Do not invent baselines, targets, customer quotations, prevalence, or
willingness to pay. Record an unknown and how to resolve it when evidence is
missing.

## Challenge before converging

- Push vague terms such as "easy," "seamless," "AI-powered," "for everyone," or
  "better" into observable behavior.
- Ask for a specific user and consequence when the user speaks only in broad
  market categories.
- Separate verified evidence, user-stated facts, hypotheses, assumptions, and
  unresolved decisions.
- State when the evidence does not support the proposed solution or scope.
- Name a stronger alternative and the evidence that would change the
  recommendation.
- Reconsider the leading product direction at least once before settling it.

Push clearly, but do not argue indefinitely. Once the user makes an informed
decision, preserve it and its rationale in the draft.

Use `ap-run-market-research` when current external market evidence is needed
and the user authorizes that separate research. Do not leak confidential ideas,
customer information, or unreleased strategy into web searches.

## Know when the interview is complete

Draft when the conversation can answer:

- the problem, target user, current alternative, and available evidence;
- the desired user outcome and why now;
- the chosen product approach, core flow, and important alternative considered;
- the narrow first-release scope and explicit non-goals;
- measurable success or a concrete measurement plan;
- important constraints, assumptions, risks, dependencies, and open questions;
  and
- a testable definition of the product behavior expected.

Do not prolong the interview merely to fill every possible template section.
Keep material uncertainty visible instead of forcing false completeness.

## Draft, review, and write

Read [references/prd-structure.md](references/prd-structure.md) before drafting.
Use only sections that help the team make or execute the product decision.

1. Present the complete draft in the conversation before writing unless the
   user explicitly asked for immediate file output.
2. Ask whether it accurately captures the intended product, what is wrong, and
   which open questions must be resolved now.
3. Revise until the user confirms the direction or explicitly accepts the
   remaining uncertainty.
4. Merge into the resolved PRD path without deleting unrelated approved
   requirements. Do not create dated archive copies; Git retains history.
5. Do not write implementation architecture, exact file changes, schemas, API
   internals, task breakdowns, or effort estimates unless they are themselves
   product constraints. Route those to technical requirements or later
   planning.

After writing, re-read the final document for contradictions, vague
requirements, invented evidence, hidden scope, stale placeholders, and broken
links. Report the path, central product decision, primary success measure,
largest assumption, and unresolved questions. Do not begin implementation.
