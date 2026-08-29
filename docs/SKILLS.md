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
