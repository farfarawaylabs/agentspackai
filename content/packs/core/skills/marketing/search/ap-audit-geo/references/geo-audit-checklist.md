# GEO and AEO audit checklist

Use this checklist to gather evidence, not to manufacture findings. Platform
behavior changes quickly; verify current first-party documentation during each
audit.

## Platform eligibility

### Google generative search

- Confirm the page is indexed, eligible for a snippet, and otherwise eligible
  for Google Search.
- Apply conventional crawling, JavaScript SEO, canonical, quality, spam, and
  page-experience guidance.
- Do not require special AI markup, a new schema type, tiny content chunks,
  AI-specific prose, or `llms.txt`. Google currently says these are unnecessary
  or ignored for Google Search.
- Use the current generative-AI performance reporting in Search Console when
  the property and report are available.

Primary source:
https://developers.google.com/search/docs/fundamentals/ai-optimization-guide

### ChatGPT Search

- Verify that OAI-SearchBot is not blocked for content the publisher wants
  included in summaries and snippets.
- Check documented IP ranges plus WAF, CDN, bot mitigation, rate limiting,
  JavaScript challenges, authentication, and geo restrictions.
- Keep OAI-SearchBot retrieval policy distinct from GPTBot training policy and
  other OpenAI agents or advertising crawlers.
- Confirm current `noindex`, robots, and referral behavior from OpenAI rather
  than assuming it matches another search engine.
- Track attributable ChatGPT referrals when current referral parameters and
  analytics make that possible.

Primary sources:
https://help.openai.com/en/articles/9237897-chatgpt-search
and
https://help.openai.com/en/articles/12627856-publishers-and-developers-faq

Published crawler IP information:
https://openai.com/searchbot.json

### Bing and Microsoft AI experiences

- Confirm the site is eligible for the Bing index and grounding experiences.
- Review Bing Webmaster Tools AI Performance for cited pages, citation trends,
  grounding queries, and other currently available dimensions.
- Treat citation data as sampled visibility evidence, not rank, traffic,
  authority, or causal proof.
- Use IndexNow for changed URLs only when it fits the platform, CMS, and
  freshness needs; it does not guarantee crawling, indexing, or citation.

Primary sources:
https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c
and
https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a

### Other answer engines

- Locate the provider's current official crawler, indexing, publisher, and
  analytics documentation.
- Verify the actual user agent and bot ownership rather than allowlisting a
  spoofable string blindly.
- Record whether the system uses its own crawler, a search partner, user-
  initiated retrieval, a training crawler, or an undisclosed mixture.
- When official evidence is unavailable, label the behavior unknown and avoid
  platform-specific promises.

## Content usefulness

- The page answers a real audience question and has a clear reason to exist
  beyond paraphrasing other sources.
- The most important answer is easy for a person to find without forcing a
  universal answer-block format.
- Headings describe meaningful questions or decisions rather than generic
  labels.
- Sections, paragraphs, tables, lists, definitions, and comparisons remain
  understandable when linked or excerpted, but are not artificially fragmented.
- Coverage includes the subquestions needed for a complete human answer without
  manufacturing thin long-tail variants.
- Critical facts remain visible in accessible text rather than image-only,
  inaccessible, interaction-only, or PDF-only form.
- Examples, caveats, edge cases, and limitations prevent an accurate statement
  from becoming misleading when shortened.

## Evidence and provenance

- Material claims include dates, units, regions, versions, and constraints.
- Third-party facts link to current primary sources when available.
- First-party data states sample, period, method, and important limitations.
- Reviews, testimonials, certifications, and expert claims are attributable and
  authorized.
- Authors, reviewers, ownership, and update processes are clear when they help
  readers assess the content; biographies are not added as a ranking trick.
- Updated dates reflect meaningful changes rather than date painting.
- Contradictory prices, features, names, statistics, or definitions are resolved
  across visible copy, metadata, structured data, feeds, and documentation.

## Entity and product clarity

- Product, organization, person, place, version, and category names are explicit
  and unambiguous.
- Current offerings are separated from discontinued, beta, waitlist, regional,
  or roadmap items.
- Organization and product facts are consistent across authoritative first-
  party pages and relevant structured data.
- Comparisons define the decision context and use evidence rather than
  unsupported "best" claims.
- Local and commerce details use maintained first-party profiles, feeds, and
  policies where those systems are relevant.

## Structured data and emerging files

- Supported structured data accurately mirrors visible content and validates.
- Schema is selected for conventional semantic or search-appearance value, not
  because it is labeled "AI schema."
- FAQ, HowTo, Product, Organization, Person, Article, or other markup is not
  added unless the current platform supports it and the page genuinely contains
  that information.
- `llms.txt` is documented as experimental or provider-specific, has an
  identified consumer, and can be kept consistent with canonical content.
- No file, feed, schema, or protocol is described as a universal GEO
  requirement.

## Measurement

- Define the relevant outcome: eligible pages, citations, cited-page coverage,
  topic visibility, referral sessions, qualified conversions, or factual answer
  accuracy.
- Preserve platform, model or product, date, locale, login state, and prompt
  protocol for manual samples.
- Use enough repeated samples to expose variability, but do not turn them into a
  fabricated universal rank.
- Segment AI referrals from conventional organic search and direct traffic when
  attribution allows.
- Compare content changes against a dated baseline and annotate demand, model,
  index, and reporting changes.
- Treat provider dashboards as incomplete or sampled when their documentation
  says so.
- Do not infer that a citation caused a conversion or that a content edit caused
  a citation change without stronger experimental evidence.

## Common myths to reject

- "GEO replaces SEO."
- "Every answer engine uses the same crawler and ranking logic."
- "A specific paragraph length or question heading guarantees citation."
- "Schema markup directly makes an LLM cite the page."
- "`llms.txt` is required for Google AI Overviews or AI Mode."
- "More generated FAQs, location pages, or keyword variants create authority."
- "Mentions from low-quality or manufactured sources improve trust."
- "Manual prompt checks reveal a stable universal ranking."
- "Citation count is equivalent to traffic, authority, or revenue."
