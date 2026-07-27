# Search and citation visibility

Read this reference only when the landing page should be indexed or discovered
through search or AI-generated search experiences.

Search behavior, supported structured data, and platform guidance change.
Verify current primary documentation before making version-sensitive claims.
The links at the end are starting points, not frozen authority.

## Search fundamentals

- Match the page to a real search task and buyer stage rather than repeating a
  target phrase.
- Name the product, category, audience, use case, supported integrations,
  industries, locations, standards, and alternatives that are materially
  relevant.
- Write one intent-aligned title, meta description, and H1.
- Use headings for the questions and decisions the visitor actually has.
- Keep important content crawlable and available in the rendered page.
- Link to useful supporting pages such as pricing, documentation, customer
  evidence, implementation guidance, and relevant comparisons.
- Give every indexed variant distinct utility. Do not mass-produce near
  duplicates for keyword, industry, or location combinations.
- Keep pricing, availability, capabilities, integrations, names, and trust
  claims current.

There is no universal ideal page length. Include the information needed to
satisfy the intent and decision; remove repetition that exists only to add
keywords.

## AI-generated search experiences

Treat "GEO" or "AEO" as an information-quality concern, not a bag of hacks.
For Google Search, normal crawling, indexing, quality, and SEO practices remain
the foundation. Google currently says that no special AI schema, `llms.txt`, or
other AI-specific machine-readable file is required.

Make useful passages easy to retrieve and understand:

- Use explicit entity names instead of ambiguous pronouns or category hype.
- Present important facts in short, self-contained statements.
- Use comparison tables, definitions, factual FAQs, and feature matrices when
  they help a reader—not merely to create extractable chunks.
- Support claims with first-party evidence and attributable third-party proof.
- Keep facts consistent between visible content, metadata, structured data, and
  linked documentation.
- Distinguish what exists now from roadmap or waitlist promises.

Do not promise citation or ranking. Different systems retrieve and attribute
content differently, and visibility must be measured.

## Structured data

Use a supported type only when it accurately describes visible page content.
Possible types include `Product`, `SoftwareApplication`, `Organization`,
`LocalBusiness`, merchant listings, or review-related types depending on the
actual page.

- Follow the requirements for the specific type.
- Do not mark up hidden, misleading, fabricated, or irrelevant information.
- Validate the result.
- Treat eligibility as an opportunity, not a guarantee of a rich result.
- Add FAQ content for user value and clarity. Do not assume `FAQPage` markup
  will produce a visible rich result; Google currently limits regular FAQ rich
  results primarily to authoritative government and health sites.

## Page experience and performance

Measure real-user field data when available. Google's current "good" Core Web
Vitals thresholds, evaluated at the 75th percentile, are:

- LCP at or below 2.5 seconds;
- INP at or below 200 milliseconds; and
- CLS at or below 0.1.

Use lab tools to diagnose problems, but do not present lab results as field
performance. Maintain responsive, accessible, stable rendering across devices.

## Current primary sources

- Google guidance for generative AI search:
  https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google Search spam policies:
  https://developers.google.com/search/docs/essentials/spam-policies
- General structured-data guidelines:
  https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Supported Search appearance features:
  https://developers.google.com/search/docs/appearance
- Core Web Vitals:
  https://web.dev/articles/vitals
