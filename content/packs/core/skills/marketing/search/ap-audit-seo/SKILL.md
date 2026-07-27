---
name: ap-audit-seo
description: Audit a public website or page for evidence-based technical, on-page, content, and measurement problems that affect conventional search discovery. Use for SEO audits, crawl or indexation problems, ranking or organic-traffic drops, canonical and sitemap issues, JavaScript SEO, metadata and internal-link review, structured-data validation, Core Web Vitals, international SEO, or requests to diagnose why a site is not appearing in search. Use ap-audit-geo for the distinct question of visibility and citations in AI-generated answers.
---

# Audit SEO

Find the highest-impact barriers between useful public content and the people
searching for it. Treat SEO as a combination of eligibility, relevance,
quality, experience, and evidence—not a checklist that guarantees rankings.

## Select the mode

- **Audit mode is the default.** Inspect and report without changing the site,
  repository, analytics, webmaster accounts, or indexing controls.
- **Fix mode applies only when the user asks for remediation.** Confirm the
  findings in scope, make focused changes, and re-verify them.

Never change `robots.txt`, `noindex`, canonicals, redirects, locale behavior, or
public/private access merely because visibility would increase. These can
encode product, legal, privacy, security, or operational policy.

## Establish scope and intent

1. Identify the site, environments, page types, languages or regions, target
   users, important search tasks, and business outcomes in scope.
2. Determine whether the request is a page review, technical audit, site-wide
   audit, migration check, or investigation of a traffic or indexation change.
3. Read repository instructions, product context, routing, rendering setup,
   content sources, metadata utilities, deployment configuration, and existing
   SEO documentation.
4. Record access to the live site, source, crawl data, logs, analytics, Google
   Search Console, Bing Webmaster Tools, field performance data, and previous
   baselines. State what is unavailable.
5. For a reported drop, build a dated timeline of deployments, migrations,
   content changes, tracking changes, demand or seasonality, manual actions, and
   confirmed search-platform updates. Timing alone does not prove causation.

Do not ask the user for information that can be found safely in the repository
or rendered site.

## Inspect source and rendered behavior

Audit the real delivery path:

- HTTP status, redirects, headers, robots controls, canonical signals, and
  caching;
- initial HTML and browser-rendered DOM;
- crawlable links, routing, pagination, and URL variants;
- metadata and structured data after JavaScript executes;
- mobile and desktop rendering, performance, and interaction; and
- sitemap, feeds, hreflang, and other discovery mechanisms when relevant.

Static fetching cannot prove that JavaScript-injected content, metadata, links,
or JSON-LD are absent. Use a real browser or an appropriate rendered inspection
tool before reporting them missing. Likewise, a browser showing content does
not prove a crawler was allowed to fetch or index it.

Use current official documentation for search-engine behavior. Verify the
framework version and deployment mode before recommending SSR, prerendering, or
another architectural change.

## Audit in impact order

Read
[references/seo-audit-checklist.md](references/seo-audit-checklist.md)
and apply only relevant checks.

Prioritize:

1. **Eligibility:** intended public pages can be crawled, rendered, indexed,
   canonicalized, and served with appropriate snippets.
2. **Discovery and architecture:** important canonical pages are linked,
   represented accurately in sitemaps, and not buried among uncontrolled
   duplicates or parameters.
3. **Intent and content:** pages satisfy distinct search tasks with accurate,
   useful, original content and clear titles, headings, entities, and links.
4. **Experience:** mobile usability, accessibility, stability, and real-user
   performance do not materially obstruct visitors.
5. **Enhancements:** structured data and search appearances are valid,
   supported, truthful, and useful.
6. **Measurement:** search and conversion data can distinguish visibility,
   clicks, qualified outcomes, and regressions.

Do not use fixed title or description character counts, keyword density,
universal word counts, one-H1 dogma, or a three-click rule as pass/fail ranking
requirements. Evaluate truncation, hierarchy, crawl depth, and wording in the
actual context.

## Validate every finding

For each candidate issue:

1. Capture the affected URL pattern, source location, rendered evidence, and
   observed search or crawl evidence.
2. State the intended behavior and verify that the current behavior conflicts
   with it.
3. Check for a control or platform behavior that makes the apparent issue
   harmless.
4. Separate confirmed defects from plausible opportunities and unavailable
   data.
5. Estimate impact from affected pages, search demand, business importance, and
   severity of the failure—not from how many checklist items it violates.

The `site:` operator, a single incognito search, a lab performance run, and a
third-party score are diagnostic hints, not authoritative index, ranking, or
field-performance evidence.

## Report and remediate

Return:

```text
## Scope and evidence
## Executive assessment
## Critical and high-impact findings
## Other findings and opportunities
## What is working
## Measurement and access gaps
## Prioritized next actions
```

For each finding include affected scope, evidence, consequence, confidence,
recommended correction, verification method, and effort or dependencies when
they are supportable. Group instances that share one root cause.

If fixes are requested, preserve working SEO behavior, add regression checks
where practical, inspect the rendered result, and run relevant builds, tests,
link or schema validators, and performance checks. Do not promise a rank,
traffic increase, rich result, crawl date, or indexation outcome.

Use `ap-audit-geo` as a separate follow-on when AI-generated answer visibility
is a material goal. Do not treat a conventional SEO pass as proof of citations
in AI experiences.
