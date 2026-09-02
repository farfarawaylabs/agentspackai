# Agents Pack skill catalog

This page lists every portable skill in the current Agents Pack core pack.
Agents Pack installs each selected skill in the native location expected by
Claude Code, Codex, and Cursor.

Coding agents can usually select a skill from a natural-language request. To
invoke one explicitly, include its exact chat activation name:

```text
Use ap-debug to investigate why this test fails intermittently.
```

The three Agents Pack management skills and three project-memory skills are always
installed. Other skills depend on the component selection for the current
repository or global scope. Ask your coding agent to “use
`ap-manage-agents-pack` to list my installed and available skills” when you are
unsure.

## Agents Pack essentials

| Skill | Chat activation name | What it does | Source |
|---|---|---|---|
| Add an MCP Server | `ap-add-mcp` | Adds, inspects, or removes a user-level remote MCP server across Claude Code, Codex, and Cursor through the safe Agents Pack CLI lifecycle. | [Open skill](../content/packs/core/skills/agents-pack/ap-add-mcp/SKILL.md) |
| Manage Agents Pack | `ap-manage-agents-pack` | Inspects and safely manages an existing Agents Pack installation, including components, synchronization, updates, pinning, rollback, and ownership checks. | [Open skill](../content/packs/core/skills/agents-pack/ap-manage-agents-pack/SKILL.md) |
| Create a New Skill | `ap-create-new-skill` | Creates or updates one canonical user-owned skill and synchronizes it across every coding agent selected in the current scope. | [Open skill](../content/packs/core/skills/agents-pack/ap-create-new-skill/SKILL.md) |
| Recall Project Memory | `ap-recall-memory` | Recalls relevant shared and local repository memory while treating it as potentially stale, untrusted project context. | [Open skill](../content/packs/core/skills/agents-pack/ap-recall-memory/SKILL.md) |
| Save Project Memory | `ap-save-memory` | Saves verified durable project knowledge as Git-trackable shared memory or ignored project-local memory. | [Open skill](../content/packs/core/skills/agents-pack/ap-save-memory/SKILL.md) |
| Maintain Project Memory | `ap-maintain-memory` | Explicitly audits, consolidates, rephrases, supersedes, and repairs portable memory while preserving scope, evidence, and useful history. | [Open skill](../content/packs/core/skills/agents-pack/ap-maintain-memory/SKILL.md) |

## Engineering

| Skill | Chat activation name | What it does | Source |
|---|---|---|---|
| Frontend Design | `ap-frontend-design` | Designs and implements distinctive, production-ready web interfaces grounded in the product, audience, content, and existing design system. | [Open skill](../content/packs/core/skills/engineering/frontend/ap-frontend-design/SKILL.md) |
| Frontend Review | `ap-frontend-review` | Reviews a rendered interface for visual quality, responsive behavior, interaction states, accessibility, design consistency, and runtime problems. | [Open skill](../content/packs/core/skills/engineering/frontend/ap-frontend-review/SKILL.md) |
| React Best Practices | `ap-react-best-practices` | Applies Vercel's version-aware React and Next.js performance guidance to waterfalls, bundles, data flow, rendering, and hot paths. | [Open skill](../content/packs/core/skills/engineering/frontend/ap-react-best-practices/SKILL.md) |
| React Composition Patterns | `ap-react-composition-patterns` | Designs scalable React component APIs with composition, explicit variants, compound components, and clear state boundaries. | [Open skill](../content/packs/core/skills/engineering/frontend/ap-react-composition-patterns/SKILL.md) |
| Test a Web App | `ap-test-web-app` | Exercises real browser flows and reports or, when requested, fixes reproducible functional failures using runtime evidence. | [Open skill](../content/packs/core/skills/engineering/testing/ap-test-web-app/SKILL.md) |
| Debug | `ap-debug` | Investigates a reproducible software problem through evidence, competing hypotheses, root-cause analysis, and regression verification. | [Open skill](../content/packs/core/skills/engineering/workflows/debugging/ap-debug/SKILL.md) |
| Develop APIs | `ap-develop-apis` | Designs, implements, debugs, or reviews HTTP APIs with thin transport layers, reusable business logic, durable contracts, and consumer documentation. | [Open skill](../content/packs/core/skills/engineering/backend/ap-develop-apis/SKILL.md) |
| Design Data Models | `ap-design-data-models` | Designs and evolves durable relational, document, key-value, or distributed data models around real domain invariants and access patterns. | [Open skill](../content/packs/core/skills/engineering/backend/ap-design-data-models/SKILL.md) |
| Write Database Queries | `ap-write-database-queries` | Builds, reviews, debugs, and optimizes safe and correct database queries, transactions, indexes, and data-access code. | [Open skill](../content/packs/core/skills/engineering/backend/ap-write-database-queries/SKILL.md) |
| Develop with Vercel AI SDK | `ap-develop-with-vercel-ai-sdk` | Builds, migrates, debugs, or reviews TypeScript AI applications against the Vercel AI SDK version actually installed in the repository. | [Open skill](../content/packs/core/skills/engineering/ai/ap-develop-with-vercel-ai-sdk/SKILL.md) |
| Handle Errors Reliably | `ap-handle-errors-reliably` | Designs and verifies explicit error contracts, translation, retries, deadlines, cancellation, cleanup, recovery, and failure-path tests. | [Open skill](../content/packs/core/skills/engineering/foundations/ap-handle-errors-reliably/SKILL.md) |
| Validate Trust Boundaries | `ap-validate-trust-boundaries` | Validates data crossing application boundaries before it can create invalid state, excessive work, or unintended authority. | [Open skill](../content/packs/core/skills/engineering/foundations/ap-validate-trust-boundaries/SKILL.md) |
| Security Audit | `ap-security-audit` | Performs a read-only, evidence-based security audit focused on credible attack paths, exploitability, and meaningful impact. | [Open skill](../content/packs/core/skills/engineering/security/ap-security-audit/SKILL.md) |
| Compress Repository TODOs | `ap-compress-todos` | Condenses a noisy TODO document without losing active work, blockers, decisions, risks, or useful handoff context. | [Open skill](../content/packs/core/skills/engineering/documentation/ap-compress-todos/SKILL.md) |
| Refresh Repository Documentation | `ap-refresh-repo-docs` | Maintains documentation with feature work and reconciles it with implemented code, configuration, architecture, commands, decisions, and product intent. | [Open skill](../content/packs/core/skills/engineering/documentation/ap-refresh-repo-docs/SKILL.md) |
| Start a Development Session | `ap-start-dev-session` | Orients the agent to the project and isolates mutable local work in a dedicated Git worktree and branch before implementation begins. | [Open skill](../content/packs/core/skills/engineering/workflows/session/ap-start-dev-session/SKILL.md) |
| Prepare a Context Handoff | `ap-clear-dev-context` | Produces a detailed, paste-ready handoff before conversation context is cleared or a development session is restarted. | [Open skill](../content/packs/core/skills/engineering/workflows/session/ap-clear-dev-context/SKILL.md) |
| Continue a Development Session | `ap-continue-dev-session` | Rebuilds and reconciles context from a prior handoff before safely resuming development work. | [Open skill](../content/packs/core/skills/engineering/workflows/session/ap-continue-dev-session/SKILL.md) |
| Review a Plan | `ap-review-plan` | Challenges a development plan through repository-grounded review and an independent subagent review when available. | [Open skill](../content/packs/core/skills/engineering/workflows/planning/ap-review-plan/SKILL.md) |
| Subagent-Driven Development | `ap-subagent-driven-development` | Explicitly executes a prepared plan through fresh task implementers, local task commits, independent review and repair loops, and final whole-branch review. | [Open skill](../content/packs/core/skills/engineering/workflows/execution/ap-subagent-driven-development/SKILL.md) |

Subagent-Driven Development is configured and instructed for explicit-only
use. Invoke it deliberately with a prepared plan, for example:

```text
Use ap-subagent-driven-development to execute docs/plans/feature.md.
```

## Design exploration, implementation, and polish

| Skill | Chat activation name | What it does | Source |
|---|---|---|---|
| Design Studio | `ap-design-studio` | Guides exploration, building, fresh critique, polish, and verification into shareable static HTML concepts; integrates a selection into the actual product only when explicitly requested. | [Open skill](../content/packs/core/skills/design/ap-design-studio/SKILL.md) |
| Explore Design Directions | `ap-explore-design-directions` | Generates three distinct direction briefs by default. Stops for the user's choice when used alone, or hands briefs to Studio for an already requested prototype batch. | [Open skill](../content/packs/core/skills/design/ap-explore-design-directions/SKILL.md) |
| Implement a New Design | `ap-implement-new-design` | Builds a direction as a standalone HTML prototype or integrates it into an application, with bounded fresh visual critique and functional verification. | [Open skill](../content/packs/core/skills/design/ap-implement-new-design/SKILL.md) |
| Polish a Design | `ap-design-polish` | Removes clutter, reduces generic visual treatments, and tightens craft while preserving the chosen identity and working behavior. Supports audit-only requests. | [Open skill](../content/packs/core/skills/design/ap-design-polish/SKILL.md) |

Use Studio for the complete process:

```text
Use ap-design-studio to create four designs for our homepage. Keep our logo,
use an editorial feel, and avoid dark backgrounds.
```

Studio builds three complete static HTML concepts by default, or the number
you request in ordinary language. It carries your constraints through the
specialist skills and presents the rendered options for selection. Add "show
me the directions before building" for an earlier checkpoint, or "ideas only"
to stop at written concepts. A request for four built concepts normally
continues through all four without asking you to choose from descriptions.

Each concept has its own directory with an HTML page, embedded styles/scripts,
and any required bundled assets. It should open directly in a browser without
the application, a backend, or package installation. Local interactions use
clearly identified demo behavior. A gallery links to all concepts, and a ZIP
keeps multi-file deliverables together for team sharing. Direct-file, offline,
and copied-package verification limits are reported explicitly.

Prototype work leaves application files and root `DESIGN.md` unchanged. Draft
design notes belong with each concept. Saying "I love concept two" selects it;
to change the actual product, ask explicitly:

```text
Take concept two, use concept one's typography, and implement it in our
actual site.
```

Studio then uses the implementation skill's application mode to translate the
selected design into the real framework, components, and behavior. It preserves
the prototype files as references. Integration does not include deployment.

By default, Studio permits an initial assessment, up to two critique-driven
revision rounds, then one polish pass and a final assessment if appearance
changed: at most four valid assessments per concept. User-specified limits
apply to the full workflow, and explicit total budgets are not multiplied by
the concept count. Stages and remaining budgets are retained across resumptions.

Studio's supporting skills and `ap-design-critic` are optional components;
installing Studio does not automatically install them. It identifies missing
content and runtime capabilities rather than claiming unavailable stages ran.

The individual skills remain useful for going through the steps manually:

```text
Use ap-explore-design-directions to suggest three directions for the product page.
Use ap-implement-new-design to build the editorial direction as a static HTML prototype.
Use ap-design-polish to clean up that prototype while preserving its typography.
```

The implementation workflow accepts a chosen concept, references, an existing
design system, or a clear description. If the direction is unclear, it offers
concepts and waits for your choice, except when you already requested a batch
of built static concepts. It uses `ap-frontend-design` for building
and `ap-frontend-review` for verification when installed, with repository-based
fallbacks. The separate optional [ap-design-critic subagent](../content/packs/core/subagents/design/ap-design-critic/instructions.md)
provides the independent visual assessments.

Every critique requires a new agent conversation with no inherited task
history. It receives only the critic role, a fixed brief and assessment
prompt, current visuals, and optional fixed reference images. Previous scores,
feedback, implementation rationale, and the target score stay with the
implementing agent. Asking an existing critic to forget its history does not
satisfy this requirement.

The standalone implementation skill defaults to a target of 8.5/10 with an
initial assessment and up to three improvement rounds. Studio passes its
assigned budget instead. Refinement stops earlier when the target is reached or
progress stalls. You can request a different target or round limit in ordinary
language. Visual scores are subjective and are reported separately from
functional checks. Missing browser or isolated-critic capabilities are
reported; implementation can proceed without claiming independent validation.
If final fixes change the appearance after the budget is exhausted, the last
score is labeled as applying to the earlier version.

Use `ap-design-polish` for a focused final cleanup of an existing interface:

```text
Use ap-design-polish on the pricing page. Reduce clutter, but preserve its
editorial typography, comparison details, and mobile purchase flow.
```

It inspects the rendered result, removes elements that do not earn their place,
then addresses generic treatments and unresolved details. It preserves useful
labels, controls, feedback, and signature elements; it does not equate polish
with making every design minimalist. Add "audit only" to receive suggestions
without source changes. Its AI-tell score is a subjective assessment of
genericness and overdesign, not a claim about AI authorship or a substitute for
functional verification. An independent critic is optional and, when
requested, must start with completely fresh context.

## Marketing and growth

| Skill | Chat activation name | What it does | Source |
|---|---|---|---|
| Landing Pages | `ap-landing-page` | Plans, writes, builds, or improves focused landing pages around a clear audience, argument, evidence, and conversion goal. | [Open skill](../content/packs/core/skills/marketing/ap-landing-page/SKILL.md) |
| Audit SEO | `ap-audit-seo` | Audits technical, on-page, content, and measurement problems that affect conventional search discovery and performance. | [Open skill](../content/packs/core/skills/marketing/search/ap-audit-seo/SKILL.md) |
| Audit GEO | `ap-audit-geo` | Audits a public site’s eligibility, usefulness, trust, citations, and measurement for AI-generated search and answer experiences. | [Open skill](../content/packs/core/skills/marketing/search/ap-audit-geo/SKILL.md) |

## Product and research

| Skill | Chat activation name | What it does | Source |
|---|---|---|---|
| Create a PRD | `ap-create-prd` | Interviews the user, challenges assumptions, narrows the solution, and creates or updates a concise product requirements document. | [Open skill](../content/packs/core/skills/product/planning/ap-create-prd/SKILL.md) |
| Run Market Research | `ap-run-market-research` | Researches a product’s market, competitors, substitutes, customer signals, pricing, opportunity, and risks using current evidence. | [Open skill](../content/packs/core/skills/product/research/ap-run-market-research/SKILL.md) |

## How to install an available skill

Ask your coding agent:

```text
Use ap-manage-agents-pack to show whether ap-frontend-design is installed. If
it is available, preview installing it and wait for my approval.
```

Or use the CLI directly:

```sh
agents-pack install ap-frontend-design --dry-run
agents-pack install ap-frontend-design --yes
```

The chat activation name and the official component ID are currently the same.
Official Agents Pack names use the reserved `ap-` prefix.
