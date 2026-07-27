---
name: ap-run-market-research
description: Research a product's market, competitors, substitutes, customer signals, pricing, distribution, opportunity, and risks, then synthesize the evidence into a decision-oriented repository document. Use when the user asks for market research, competitive analysis, market sizing, TAM/SAM/SOM, competitor discovery, market gaps, positioning evidence, pricing landscape, go-to-market context, or validation of a product opportunity.
---

# Run Market Research

Produce current, evidence-backed research for a defined product decision. Avoid
comprehensive-looking reports that hide weak evidence.

## Establish the research brief

Read repository instructions, `PRD.md`, product documentation, technical
requirements, existing research, positioning, and relevant analytics summaries
when available. Do not require a particular path and do not stop merely because
no PRD exists.

Determine:

- the decision this research must inform;
- product, problem, job to be done, and current alternatives;
- target users, buyers, and other decision-makers;
- geography, industry, business model, and product stage;
- time horizon and `As of` date;
- important constraints and assumptions; and
- the appropriate report location.

If context is incomplete, create a clearly labeled working brief from the
available evidence. Ask the user only when a missing choice would materially
change the research.

Do not place confidential product details, personal data, private customer
evidence, credentials, or unreleased strategy into web queries. Translate the
question into non-sensitive category and problem language.

## Build an evidence plan

Define the questions and evidence needed before searching. Cover only the areas
that matter to the decision:

- market definition, boundaries, adjacent categories, and status quo;
- demand signals, buying behavior, pain, and switching triggers;
- direct competitors, indirect substitutes, internal solutions, manual
  workarounds, and doing nothing;
- product capabilities, positioning, pricing, packaging, and distribution;
- market structure, growth drivers, maturity, regulation, and durable trends;
- market size and economics when credible inputs exist; and
- opportunities, barriers, counterevidence, and reasons not to enter.

Use current web research rather than training knowledge for market facts,
pricing, product behavior, company status, regulation, and trends.

## Research systematically

- Start broad enough to discover the category's own language, then follow
  evidence into specific competitors, substitutes, segments, and sources.
- Prefer first-party product pages, pricing, documentation, changelogs, public
  filings, regulator material, official datasets, and research with a stated
  method.
- Use independent reporting, app stores, review platforms, public communities,
  repositories, and launch directories to corroborate or challenge first-party
  claims.
- Open and read the source. Do not cite a search-result snippet as evidence.
- Record publication or observation dates and distinguish the date published
  from the period measured.
- Trace market statistics and quoted claims to the original dataset or report
  when possible.
- Seek independent corroboration for material conclusions and preserve
  disagreement between credible sources.
- Report inaccessible, paywalled, authenticated, stale, or geographically
  restricted evidence. Do not imply it was reviewed.

Choose research depth from market complexity and decision risk, not a universal
competitor count, review quota, or source quota.

## Analyze competitors and substitutes

- Define why each product is direct, indirect, adjacent, a workaround, or
  status quo.
- Verify current availability, target customer, positioning, capabilities,
  pricing, packaging, and important constraints from first-party sources.
- Distinguish shipped products from announcements, demos, waitlists, and
  roadmap claims.
- Compare dimensions that affect the target user's decision. Do not create a
  feature matrix merely to reward the product with the most checkmarks.
- Describe strengths and weaknesses relative to a user, job, and context—not
  as universal judgments.
- Do not guess private revenue, customer count, market share, growth,
  profitability, retention, funding, or strategy. Label credible estimates as
  estimates and retain their method and date.
- Do not treat an apparent positioning gap as demand. State what user or buying
  evidence would validate the opportunity.

## Interpret customer signals carefully

Public reviews, support discussions, forums, search behavior, and social posts
can reveal language, use cases, workarounds, and hypotheses. They are
self-selected and platform-shaped:

- separate direct statements and observations from interpretation;
- preserve the source, date, product version, and relevant context;
- group recurring themes without implying population prevalence;
- include positive outcomes, divergent cases, and reasons users stay;
- do not invent personas, demographics, motivations, quotations, or
  willingness to pay; and
- do not call public-web synthesis primary user research.

Use the `ap-ux-researcher` subagent when available to synthesize actual interviews,
usability evidence, surveys, support data, or product analytics supplied by the
team.

## Size the market only when supportable

Define the market unit before calculating money or users. Prefer transparent
bottom-up calculations tied to target customers, reachable geography, buying
frequency, adoption constraints, and realistic pricing.

For every estimate:

- show the formula, inputs, units, period, geography, segment, sources, and
  assumptions;
- use ranges or scenarios when inputs are uncertain;
- distinguish reported figures from calculations and inference;
- explain material differences between credible estimates rather than
  averaging incompatible definitions; and
- give a confidence level with the main sensitivity.

Calculate TAM, SAM, or SOM only when the decision requires them and the terms
are precisely defined. SOM is not an arbitrary percentage of SAM. If credible
inputs are unavailable, state that the value is unknown and specify how it
could be measured.

## Synthesize for a decision

Separate:

1. sourced facts;
2. interpretations and assumptions;
3. counterevidence and unknowns;
4. implications for this product; and
5. recommendations and validation steps.

Challenge the leading conclusion against at least one alternative explanation
or strategy, including not entering or not changing the product. Keep
recommendations proportional to the evidence.

Before writing, read
[references/report-structure.md](references/report-structure.md). Use only the
sections relevant to the decision rather than filling a rigid template.

Write the report to the repository's established product or research
documentation area. If no convention or user-specified path exists, use
`docs/MARKET_RESEARCH.md`. Read and reconcile an existing report before
replacing it. Include an `As of` date and direct citations near material claims.
Do not create dated copies by default; Git already retains history.

If the user asks for analysis only, return the report without writing a file.

## Boundaries and completion

Use `ap-trend-researcher` for read-only deep analysis of a particular emerging
signal. This skill owns the broader market frame, synthesis, and repository
artifact.

Do not contact companies or users, create accounts, purchase reports, start
trials, scrape restricted data, accept legal terms, or publish findings without
explicit authorization.

Before finishing:

- verify cited links, dates, calculations, competitor facts, and the report
  path;
- inspect the final document for unsupported claims and stale placeholders;
- state material research gaps and inaccessible sources; and
- summarize the decision, strongest evidence, largest uncertainty, primary
  risk, and recommended next validation step.
