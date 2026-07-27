# PRD structure

Produce a concise decision document, normally one to three pages. Let product
complexity determine length; do not pad a simple feature or compress a complex
product until important decisions disappear.

Use only relevant sections and omit empty placeholders.
Default the status to `Draft`. Do not mark a PRD `Approved` unless the user or
the repository's documented approval process explicitly approves it.

```markdown
# [Product or feature name]

**Status:** Draft | In review | Approved
**Updated:** YYYY-MM-DD

## Summary

[The product decision in a short paragraph: target user, problem, proposed
outcome, and narrow first release.]

## Problem and evidence

### Target user

[A specific user or segment defined by relevant behavior, context, and need.]

### Current experience

[What the user does today, the status quo or workaround, and the concrete
consequence.]

### Evidence and assumptions

- **Observed:** [Research, behavior, support signal, or product data, with a
  source when available.]
- **User-stated:** [Relevant fact supplied by the product owner.]
- **Hypothesis:** [Important claim that still needs validation.]

## Goals and non-goals

### Goals

- [User or business outcome this version should enable.]

### Non-goals

- [Related outcome this version deliberately will not address.]

## Product approach

[Describe the user-facing solution and why it is the selected response to the
problem. Include the most important alternative considered and why it was not
selected.]

### Core user flow

1. [User starts from a realistic state.]
2. [User takes an action.]
3. [Product responds.]
4. [User reaches the intended outcome.]

Include alternate, error, or recovery flows only when they materially define
the product.

## First-release scope

| ID | Requirement | Acceptance signal |
|----|-------------|-------------------|
| R1 | [Observable product capability or behavior] | [Clear pass/fail product result] |

Requirements should describe what users or the system can accomplish, not the
files, classes, endpoints, or implementation technique used to build it.

### Later

- [Valuable capability intentionally deferred beyond the first release.]

### Out of scope

- [Adjacent capability explicitly excluded.]

## Success measures

| Measure | Baseline | Target or decision threshold | Window | Source |
|---------|----------|------------------------------|--------|--------|
| [User outcome] | [Known or unknown] | [Supported target or validation needed] | [Period] | [Instrumentation or evidence] |

Include a primary user-outcome measure and only the guardrails needed to prevent
a misleading win. Never fabricate a baseline or target. If measurement is not
ready, state the instrumentation or research needed before setting one.

## Constraints and dependencies

- [Product, policy, legal, privacy, accessibility, operational, platform,
  timeline, or external dependency that materially constrains the experience.]

Keep implementation preferences in `TECHNICAL_REQUIREMENTS.md` unless they
create a real product constraint.

## Risks and assumptions

| Risk or assumption | Why it matters | How to validate or mitigate |
|--------------------|----------------|-----------------------------|
| [Material uncertainty] | [Possible consequence] | [Evidence or experiment needed] |

## Open questions

- [Unresolved decision, owner when known, and when it must be resolved.]
```

## Quality checks

- The problem identifies a user, current behavior, and consequence.
- Evidence is distinguishable from hypotheses and product-owner assertions.
- The proposed approach is not merely a feature list.
- The core flow reaches an end-to-end user outcome.
- First-release requirements are necessary, observable, and internally
  consistent.
- Non-goals, later work, and out-of-scope items prevent obvious scope creep.
- Success measures evaluate outcomes rather than feature delivery alone.
- Unknown numbers remain unknown instead of becoming invented targets.
- Risks include ways the product can fail despite correct implementation.
- The document contains product decisions, not an embedded engineering plan.
