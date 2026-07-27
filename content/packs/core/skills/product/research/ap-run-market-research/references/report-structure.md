# Market research report structure

Adapt this structure to the decision. Omit unsupported or irrelevant sections;
never fill a heading with speculation to make the report look complete.

## Front matter

```markdown
# Market Research: [Product or decision]

- As of: YYYY-MM-DD
- Decision: [What this research informs]
- Scope: [Audience, geography, category, and time horizon]
- Product context: [Repository source documents]
- Confidence: High | Medium | Low — [reason]
```

## Executive conclusion

State:

- the decision-relevant conclusion;
- the strongest supporting evidence;
- the most important counterevidence or uncertainty;
- the primary opportunity and risk; and
- the recommended action or next validation step.

## Market definition and evidence

Define the included customers, use cases, geography, business model, spend or
usage unit, and meaningful exclusions. Explain adjacent categories and current
alternatives.

Use an evidence table when it makes provenance clearer:

```markdown
| Claim or signal | Observation | Source and date | What it supports | Limits |
|---|---|---|---|---|
```

Cover demand, maturity, growth drivers, regulation, technology, or market
dynamics only when they affect the decision.

## Market sizing

When supportable, include:

```markdown
| Scenario | Formula and inputs | Estimate | Confidence | Main sensitivity |
|---|---|---:|---|---|
```

Define TAM, SAM, and SOM in this product's terms before using the labels.
Separate sourced inputs from calculated outputs. Include the arithmetic and
avoid false precision.

## Competitive landscape

Include direct competitors, indirect substitutes, workarounds, and status quo.
A useful overview table is:

```markdown
| Alternative | Type | Target user and job | Positioning | Pricing as of | Relevant strengths | Relevant limits | Sources |
|---|---|---|---|---|---|---|---|
```

Deep-dive only on alternatives that materially affect the decision. Compare
decision criteria rather than every advertised feature. Identify whether each
claim is first-party, independently observed, inferred, or unknown.

## Customer and buyer signals

Describe:

- observed language, jobs, pain, workarounds, and outcomes;
- buying triggers, objections, switching costs, and distribution context;
- which source populations are represented; and
- selection bias, missing segments, and evidence that would require direct
  research.

Do not turn review themes or public posts into representative prevalence,
personas, or willingness-to-pay claims.

## Opportunity, threats, and strategic implications

For each material implication, connect:

```markdown
Evidence → interpretation → product implication → recommendation
```

Include market gaps, underserved contexts, positioning or pricing options,
barriers, incumbent responses, platform dependence, regulation, distribution,
and reasons the proposed opportunity may not exist.

Separate:

- durable advantages or needs;
- temporary or weak signals;
- claims contradicted by evidence;
- assumptions requiring validation; and
- decisions that remain reversible.

## Recommendations and learning plan

Prioritize a small set of recommendations. For each, state:

- supporting and opposing evidence;
- confidence;
- expected decision value;
- key dependency or risk; and
- the smallest ethical validation step that would change the decision.

Do not prescribe feature priorities or positioning solely from competitor
absence. A gap requires evidence that the target market values it.

## Limitations and sources

List:

- unanswered questions;
- inaccessible, paywalled, stale, or non-comparable evidence;
- important assumptions and sensitivity;
- direct links for every material source; and
- the date each volatile product or pricing fact was checked.

Keep citations near claims even when a source list is also provided.
