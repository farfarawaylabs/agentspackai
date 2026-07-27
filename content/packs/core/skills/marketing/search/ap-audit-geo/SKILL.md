---
name: ap-audit-geo
description: Audit a public site's eligibility, usefulness, trust, citations, and measurement for AI-generated search and answer experiences. Use for generative engine optimization, GEO, answer engine optimization, AEO, AI-search visibility, Google AI Overviews or AI Mode, ChatGPT Search, Bing or Copilot citations, grounding queries, AI referral traffic, crawler access for answer engines, or requests to make content easier for AI systems to discover and cite. Use ap-audit-seo for a conventional technical and on-page SEO audit.
---

# Audit GEO

Evaluate whether useful public content can participate credibly in AI-generated
answers. Treat GEO and AEO as emerging visibility and measurement disciplines,
not a guaranteed ranking formula or a collection of AI-specific hacks.

## Select the mode

- **Audit mode is the default.** Inspect and report without changing content,
  crawler policy, metadata, analytics, or infrastructure.
- **Fix mode applies only when the user asks for remediation.** Confirm the
  target platforms and findings before changing anything.

Do not enable a crawler, publish confidential material, add tracking, or change
training permissions solely to increase AI visibility. Search retrieval,
training, user-initiated browsing, advertising, and agent access may use
different bots and policies.

## Define the question

1. Identify the target audiences, countries, languages, topics, questions, and
   AI experiences that matter.
2. Determine whether the goal is eligibility, citations, referral traffic,
   brand or entity accuracy, content planning, or diagnosis of a visibility
   change.
3. Read product context, editorial standards, first-party evidence, content
   sources, SEO setup, crawler policy, structured data, analytics, and existing
   search reports.
4. Record access to the live site, source, server or CDN logs, Google Search
   Console, Bing Webmaster Tools AI Performance, analytics, and any platform-
   specific evidence.
5. Establish a dated baseline. AI answers vary by platform, model, location,
   language, time, personalization, and prompt; a few manual prompts are not a
   stable rank tracker.

Do not send confidential product language, customer information, or unreleased
strategy to public search or answer systems.

## Check eligibility before rewriting content

For each target platform, verify current official crawler and index guidance:

- the intended page is public, fetchable, and served successfully;
- `robots.txt`, meta and HTTP robots controls, snippet controls, WAF, CDN,
  rate limits, JavaScript challenges, authentication, and geo rules match the
  publisher's intent;
- important facts and links appear in accessible rendered content; and
- canonical, duplicate, and structured-data signals do not contradict the
  visible page.

Use `ap-audit-seo` when these checks reveal broader crawl, indexation, rendering,
or site-architecture problems. A GEO rewrite cannot repair a page that the
target system cannot retrieve.

## Evaluate usefulness and trust

Read
[references/geo-audit-checklist.md](references/geo-audit-checklist.md)
and apply the platform guidance that is current and relevant.

Prioritize content that:

- contributes original reporting, first-hand experience, expert reasoning,
  product facts, data, examples, or a useful point of view;
- answers a real user question completely and accurately without slow,
  promotional throat-clearing;
- names entities, versions, regions, dates, units, and constraints explicitly;
- supports material claims with primary sources, transparent methodology, or
  attributable evidence;
- keeps important facts visible, accessible, internally consistent, and aligned
  with metadata and structured data;
- uses descriptive headings, concise sections, lists, tables, definitions, or
  FAQs only where they help a human understand and reuse the information; and
- distinguishes current capabilities and facts from opinion, estimates,
  roadmap promises, and stale historical information.

Do not flatten brand voice into robotic answer blocks, fragment every page into
tiny chunks, generate thin question variants, stuff entities, manufacture
mentions, or rewrite content merely to sound like an AI answer. Google
currently says none of those AI-specific tactics is required.

## Verify platform claims

Do not generalize one provider's behavior to every answer engine.

- Confirm crawler names, IP documentation, robots semantics, snippet controls,
  supported reports, and referral parameters from current first-party sources.
- Treat structured data as truthful semantic and search-appearance support, not
  special AI markup.
- Add `llms.txt` or another emerging file only when a target system or explicit
  product requirement currently uses it and the team can maintain it. Google
  currently ignores `llms.txt` for Search.
- Do not claim that a specific passage, schema type, content length, heading
  pattern, mention, or tool guarantees retrieval or citation.

## Measure without false causality

Use the strongest available evidence:

- provider reports for AI visibility, cited pages, grounding queries, topics,
  or citations;
- crawl and edge logs for verified crawler access and failures;
- analytics for attributable AI referral sessions and qualified outcomes;
- search-console data for underlying eligibility and discovery; and
- a documented, repeatable prompt sample for qualitative accuracy checks.

Separate citations, links, impressions, sessions, conversions, sentiment, and
answer accuracy. A citation is not a click, rank, authority score, or proof that
a content change caused the result. Record dates and external platform changes
when comparing periods.

## Validate and report

For each finding include:

- platform and affected URLs or content group;
- observed evidence and evidence date;
- user or business consequence;
- whether the issue concerns eligibility, content usefulness, trust,
  consistency, or measurement;
- confidence and remaining uncertainty;
- recommended correction and how to verify it; and
- whether SEO, editorial, analytics, infrastructure, legal, or another owner
  must act.

Return:

```text
## Scope, platforms, and evidence
## Executive assessment
## Eligibility findings
## Content, trust, and consistency findings
## Measurement findings
## What is working
## Prioritized experiments and fixes
## Limitations
```

If fixes are requested, preserve human readability and truthful publisher
policy, verify rendered content and crawler behavior, and establish measurement
before promising improvement. Never guarantee inclusion, citation, traffic, or
placement in an AI-generated answer.
