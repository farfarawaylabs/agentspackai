# Agents Pack content

This directory contains the editable source for first-party Agents Pack
content. Git provides its history; source folders are not duplicated by
version.

Each pack is self-contained under `packs/`. Its `pack.toml` declares the pack
version, release-notes path, and canonical components. `RELEASE_NOTES.md`
describes only that pack version. Published pack versions are built as GitHub
Release artifacts outside this source tree, and the static registry under
`registry/` points clients to the current artifact.

Canonical skills are organized by responsibility in the source tree while
their leaf directory names remain globally unique. Agent adapters install them
into each provider's flat skill root, so source categories do not become part
of the installed skill name. All official Agents Pack skills and subagents use
the `ap-` namespace; manifest component IDs remain stable so updates can track
the same logical component across content revisions.

```text
packs/core/skills/
├── agents-pack/
│   ├── ap-add-mcp/
│   ├── ap-create-new-skill/
│   ├── ap-manage-agents-pack/
│   ├── ap-maintain-memory/
│   ├── ap-recall-memory/
│   └── ap-save-memory/
├── engineering/
│   ├── ai/
│   │   └── ap-develop-with-vercel-ai-sdk/
│   ├── backend/
│   │   ├── ap-design-data-models/
│   │   ├── ap-develop-apis/
│   │   └── ap-write-database-queries/
│   ├── documentation/
│   │   ├── ap-compress-todos/
│   │   └── ap-refresh-repo-docs/
│   ├── foundations/
│   │   ├── ap-handle-errors-reliably/
│   │   └── ap-validate-trust-boundaries/
│   ├── frontend/
│   │   ├── ap-frontend-design/
│   │   ├── ap-frontend-review/
│   │   ├── ap-react-best-practices/
│   │   └── ap-react-composition-patterns/
│   ├── security/
│   │   └── ap-security-audit/
│   ├── testing/
│   │   └── ap-test-web-app/
│   └── workflows/
│       ├── debugging/
│       │   └── ap-debug/
│       ├── planning/
│       │   └── ap-review-plan/
│       └── session/
│           ├── ap-clear-dev-context/
│           ├── ap-continue-dev-session/
│           └── ap-start-dev-session/
├── marketing/
│   ├── search/
│   │   ├── ap-audit-geo/
│   │   └── ap-audit-seo/
│   └── ap-landing-page/
└── product/
    ├── planning/
    │   └── ap-create-prd/
    └── research/
        └── ap-run-market-research/
```

Canonical subagents use the same responsibility-first organization. Each leaf
contains portable instructions plus a small provider-neutral execution profile:

```text
packs/core/subagents/
├── design/
│   └── ap-ux-enhancer/
│       ├── agent.toml
│       └── instructions.md
├── engineering/
│   ├── backend/
│   │   ├── ap-backend-python-developer/
│   │   │   ├── agent.toml
│   │   │   └── instructions.md
│   │   └── ap-backend-typescript-developer/
│   │       ├── agent.toml
│   │       └── instructions.md
│   └── ap-code-reviewer/
│       ├── agent.toml
│       └── instructions.md
└── research/
    ├── ap-trend-researcher/
    │   ├── agent.toml
    │   └── instructions.md
    └── ap-ux-researcher/
        ├── agent.toml
        └── instructions.md
```

Adapters render that source into each provider's native format. Provider model
names are deliberately not stored in the content; the execution profile
expresses only portable intent such as read-only access and reasoning effort.

The current core pack contains:

- durable cross-agent project instructions;
- required `ap-manage-agents-pack`, `ap-create-new-skill`, and `ap-add-mcp`
  workflows for safely managing Agents Pack, creating one canonical portable
  skill, and configuring remote MCP servers across coding agents from inside a
  coding-agent conversation;
- required `ap-recall-memory` and `ap-save-memory` workflows for automatically
  using repository-owned shared and project-local memory through ordinary
  Markdown and filesystem tools, plus the explicitly invoked
  `ap-maintain-memory` workflow for conservative corpus maintenance;
- `ap-frontend-design`, including the shared `DESIGN.md` contract;
- `ap-frontend-review`, including an evidence-based visual QA checklist;
- `ap-react-best-practices`, adapted from Vercel's React and Next.js
  performance guidance with 70 progressive rule references;
- `ap-react-composition-patterns`, adapted from Vercel's guidance for
  scalable component APIs, shared state, explicit variants, and React 19;
- `ap-design-data-models`, including conceptual, relational, document,
  distributed, lifecycle, and schema-evolution guidance;
- `ap-develop-apis`, including thin API architecture, contract, security,
  reliability, testing, Postman collection, and consumer-guide guidance;
- `ap-develop-with-vercel-ai-sdk`, including version-matched documentation,
  AI SDK 7 agents, tools, context, approvals, streaming, persistence, migration,
  telemetry, safety, and testing guidance;
- `ap-handle-errors-reliably`, including failure classification, typed error
  contracts, safe translation, retries, deadlines, cancellation, idempotency,
  cleanup, partial failure, observability, and failure-path testing;
- `ap-debug`, including reproducible evidence collection, execution-path
  tracing, competing hypotheses, discriminating experiments, root-cause fixes,
  regression tests, and explicit reassessment after repeated failed attempts;
- `ap-test-web-app`, including focused, change-aware, smoke, and broad browser
  QA; real user flows; state, console, and network evidence; reproducible
  findings; authorized fixes; and honest coverage limits;
- `ap-security-audit`, including threat and attack-surface mapping,
  authorization, business logic, dependencies, delivery, AI systems,
  exploitability validation, false-positive filtering, risk-based reporting,
  and safe read-only operation;
- `ap-compress-todos`, including canonical TODO discovery, status verification,
  preservation of active work and decisions, milestone summarization,
  uncertainty handling, and loss-aware compaction;
- `ap-refresh-repo-docs`, including documentation inventory, authority mapping,
  change-driven maintenance, code and configuration reconciliation,
  preservation of future intent, feature-local decision rationale, a fallback
  documentation structure, link repair, and evidence-based verification;
- `ap-start-dev-session`, `ap-clear-dev-context`, and
  `ap-continue-dev-session`, which
  orient new work in an isolated Git worktree and branch, produce a verified
  context handoff, and safely reconcile that handoff with repository state and
  available memory;
- `ap-review-plan`, which grounds a plan in the repository, runs an independent
  parallel review when subagents are available, challenges architecture,
  sequencing, risk, and verification, and returns a corrected plan;
- `ap-validate-trust-boundaries`, including syntactic and semantic validation,
  parsing limits, normalization, unknown fields, client and server ownership,
  files, Unicode, URLs, paths, archives, upstream data, and adversarial tests;
- `ap-write-database-queries`, including query correctness, security,
  performance, indexing, transactions, concurrency, and operational guidance;
- `ap-landing-page`, including conversion, search, citation, and pre-publish
  guidance;
- `ap-audit-seo`, including crawl and index eligibility, canonicals, sitemaps,
  JavaScript rendering, site architecture, international SEO, on-page quality,
  structured data, page experience, search measurement, and evidence-based
  prioritization;
- `ap-audit-geo`, including platform-specific AI-search eligibility, crawler
  policy, content usefulness, entity and evidence clarity, citation and
  grounding measurement, referral attribution, and explicit rejection of
  unsupported GEO and AEO myths;
- `ap-create-prd`, including repository orientation, a conversational product
  interview, demand and status-quo pressure, premise and alternative
  challenges, narrow first-release scope, evidence-aware success measures,
  user-confirmed drafting, and canonical PRD maintenance;
- `ap-run-market-research`, including decision framing, current source research,
  competitors and substitutes, customer-signal limitations, transparent market
  sizing, counterevidence, strategic implications, and a dated repository
  report;
- the read-only `ap-code-reviewer` subagent, which reviews the actual change for
  high-confidence correctness, security, regression, architecture,
  documentation, and test risks without modifying the worktree;
- the write-capable `ap-backend-python-developer` subagent, which implements
  server-side Python using repository-aware architecture, thin transport
  boundaries, simple API/BL/DL tiers, focused files, modern but
  version-compatible Python, explicit resource and async lifecycles, and the
  project's own dependency and verification tools;
- the write-capable `ap-backend-typescript-developer` subagent, which implements
  server-side TypeScript using repository-aware architecture, thin transport
  boundaries, simple API/BL/DL tiers, focused files, shared utilities, strict
  runtime and static typing, and the project's own test and build tools;
- the write-capable `ap-ux-enhancer` subagent, which improves an existing
  user-facing flow by prioritizing completion, comprehension, recovery,
  accessibility, efficiency, and trust before adding restrained,
  context-appropriate delight;
- the read-only `ap-trend-researcher` subagent, which investigates current product,
  technology, market, and user-behavior signals with dated sources, explicit
  uncertainty, counterevidence, product implications, and low-cost validation
  experiments;
- the read-only `ap-ux-researcher` subagent, which synthesizes existing user
  evidence and plans ethical human research while preserving provenance,
  consent, privacy, sampling limits, counterevidence, and the distinction
  between observation and interpretation.

Claude Code exposes the portable action skills as slash commands, including
`/ap-start-dev-session`, `/ap-clear-dev-context`, `/ap-continue-dev-session`,
`/ap-create-prd`, `/ap-review-plan`, `/ap-debug`, `/ap-test-web-app`,
`/ap-security-audit`, `/ap-audit-seo`, `/ap-audit-geo`,
`/ap-compress-todos`, `/ap-refresh-repo-docs`, and
`/ap-run-market-research`, `/ap-manage-agents-pack`, and
`/ap-create-new-skill`, `/ap-recall-memory`, `/ap-save-memory`, and
`/ap-maintain-memory`. Agents Pack does not generate duplicate legacy
`.claude/commands/` files.

Test-only historical packs remain under `fixtures/`.
