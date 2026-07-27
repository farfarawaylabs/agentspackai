# SEO audit checklist

Use this as a routing checklist. A checked item is not automatically a finding,
and an unchecked enhancement is not automatically a defect.

## Eligibility and crawl behavior

- Important public URLs return an intentional status and do not enter redirect
  chains, loops, soft-404 states, login walls, or environment redirects.
- `robots.txt` allows intended crawling and does not expose private content as
  a substitute for authentication.
- Indexable pages do not carry accidental `noindex`, `nosnippet`, or conflicting
  `X-Robots-Tag` directives.
- Pages that intentionally use `noindex` remain crawlable long enough for
  compliant crawlers to observe the directive.
- WAF, CDN, bot protection, rate limits, consent flows, and geo rules do not
  unintentionally block intended search crawlers.
- Critical CSS, JavaScript, images, and API responses required for rendering are
  crawlable and return successfully.

## Canonicals, duplicates, and URLs

- Canonical signals represent the product's intended URL and agree across
  redirects, HTML or HTTP headers, internal links, hreflang, and sitemap.
- Parameter, filter, sort, campaign, print, case, trailing-slash, protocol,
  hostname, and duplicate-content variants are controlled proportionately.
- A missing self-canonical is not reported as a defect when no duplicate or
  ambiguous signals exist.
- Redirects are used for retired or moved URLs; canonicals are not used as a
  substitute for navigation or migration.
- URLs are stable, understandable, and free of accidental session or
  user-specific state. Keywords are not forced into URLs.

## Discovery and architecture

- Important pages have crawlable `<a href>` links from relevant pages and are
  not orphaned.
- Link hierarchy reflects product and content relationships; crawl depth is
  evaluated relative to importance and site size rather than a universal
  number.
- Pagination, infinite scroll, faceted navigation, and internal search do not
  hide important content or create uncontrolled crawl spaces.
- XML sitemaps, when useful, contain absolute canonical indexable URLs, return
  successfully, and use truthful `lastmod` values.
- Sitemaps are treated as discovery and canonical hints, not guarantees.
- Large or frequently changing sites use logs, crawl statistics, feeds, or
  submission mechanisms proportionately.

## Rendering and JavaScript

- Important content, links, titles, descriptions, canonical tags, robots tags,
  and structured data appear correctly in the rendered DOM.
- Initial HTML and server behavior give users and crawlers a resilient result;
  SSR or prerendering is recommended only after diagnosing a real rendering,
  performance, or crawler-compatibility problem.
- Client-side routes use real URLs and crawlable links rather than fragment-only
  content.
- Error, empty, expired, and deleted states return meaningful HTTP status codes
  and do not become soft 404s.
- Hydration, lazy loading, consent, personalization, or user interaction does
  not hide index-critical content indefinitely.

## International and multi-regional sites

- Each locale has a stable URL and substantial localized content.
- `hreflang`, when used, has valid codes, reciprocal and self references, and
  canonical indexable destinations.
- Locale canonicals do not collapse genuinely distinct translations into one
  language.
- Automatic locale redirects do not prevent crawlers or users from reaching
  other versions.
- Titles, main content, navigation, metadata, currency, units, and regional
  facts are localized consistently.

## Titles, headings, snippets, and media

- Each important page has a useful, distinct title and a primary heading that
  describe the real page intent without stuffing.
- Meta descriptions are accurate and useful where editorial control matters;
  they are not judged by a rigid length rule or assumed to be shown verbatim.
- Headings create a meaningful content hierarchy and are not used only for
  styling. Multiple H1 elements are evaluated semantically, not treated as an
  automatic failure.
- Images have dimensions, responsive delivery, appropriate loading behavior,
  and purpose-appropriate alternative text. Decorative images are ignored by
  assistive technology.
- Video, audio, and image-only information has sufficient text, captions, or
  transcripts when discovery and accessibility require it.

## Content, intent, and trust

- Each indexed page serves a distinct user and search task better than
  duplicating or paraphrasing another page.
- Claims, prices, availability, dates, authorship, policies, and product
  capabilities are accurate and maintained.
- Important factual claims use primary evidence, first-hand experience,
  methodology, or attributable sources.
- Content demonstrates useful original value rather than scaled summaries,
  doorway variants, hidden text, keyword stuffing, reputation abuse, or
  misleading freshness.
- Internal links use descriptive language and connect readers to genuinely
  useful next steps without manipulative anchor patterns.
- Competing pages targeting the same need are consolidated, differentiated, or
  intentionally positioned rather than labeled "cannibalization" from keyword
  overlap alone.

## Structured data and search appearances

- JSON-LD or other markup is inspected in the rendered page, not inferred from a
  text-only fetch.
- The type is currently supported for the desired search appearance and all
  required properties follow its current documentation.
- Markup describes visible, truthful content on the same canonical page.
- Prices, ratings, availability, organization identity, breadcrumbs, and other
  facts agree with visible content and source systems.
- Rich Results Test, schema validation, or Search Console evidence is used when
  available. Valid markup creates eligibility, not a guaranteed appearance.
- FAQ content is added for users, not merely to obtain a rich result.

## Page experience and performance

- Mobile and desktop content, links, and functionality are materially
  equivalent and usable.
- Accessibility, intrusive overlays, consent, layout stability, and primary
  task completion are checked alongside speed.
- Field data is preferred for real-user conclusions; lab data is labeled as
  diagnostic.
- When Core Web Vitals are relevant, verify current definitions. Current good
  thresholds are LCP at or below 2.5 seconds, INP at or below 200 milliseconds,
  and CLS at or below 0.1 at the 75th percentile.
- Performance fixes target measured causes rather than deleting useful content
  or introducing architectural complexity for a score.

## Measurement and change diagnosis

- Search Console and Bing Webmaster Tools ownership, coverage, manual actions,
  crawl data, query and page performance, and enhancement reports are reviewed
  when access is available.
- Analytics distinguishes organic landing sessions, conversions, quality, and
  tracking changes.
- Baselines use comparable dates, devices, countries, queries, and page groups.
- Traffic changes are separated into impressions, average position, click-
  through rate, indexing, demand, seasonality, SERP changes, and conversion.
- Search-platform updates are verified from official status or release sources;
  correlation with an update is not presented as causation.

## Current primary starting points

Verify these sources during an audit because behavior and supported features
change:

- Google Search Essentials:
  https://developers.google.com/search/docs/essentials
- Google JavaScript SEO:
  https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Google canonical guidance:
  https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google sitemap guidance:
  https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google structured-data policies and supported appearances:
  https://developers.google.com/search/docs/appearance/structured-data/sd-policies
  and https://developers.google.com/search/docs/appearance
- Google spam policies:
  https://developers.google.com/search/docs/essentials/spam-policies
- Core Web Vitals:
  https://web.dev/articles/vitals
- Bing Webmaster Guidelines:
  https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a
