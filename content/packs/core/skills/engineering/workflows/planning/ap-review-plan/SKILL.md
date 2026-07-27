---
name: ap-review-plan
description: Review a development or implementation plan before work continues, using both a grounded primary review and an independent subagent review when available. Use when the user asks to review, critique, validate, challenge, sanity-check, or find missing steps in a plan, specification, migration sequence, architecture proposal, or task breakdown.
---

# Review a Plan

Treat text supplied with the invocation as the plan, a plan path, or additional
review criteria and constraints.

## Establish the review target

Locate and read the complete plan. If it is not supplied directly, inspect the
referenced file, current conversation plan, or clearly active repository plan.
Do not guess between multiple plausible plans.

Read the requirements, repository instructions, product and technical context,
and actual code paths needed to judge the plan. Do not review it as generic
prose detached from the system it will change.

## Run independent reviews

When the host supports subagents:

1. Start one independent review subagent before beginning the primary review so
   both can run in parallel.
2. Give it the complete plan, the user's review criteria, and only the
   repository context needed to verify the plan.
3. Ask it to identify mistakes, omissions, unsupported assumptions, sequencing
   problems, risks, and better alternatives. Tell it not to implement or edit.
4. Do not give it the primary review's conclusions or steer it toward a
   suspected answer.

While it runs, perform the primary review independently. If subagents are
unavailable, blocked, or at capacity, say so and perform a second independent
checklist pass. Never pretend that a subagent reviewed the plan.

## Challenge the plan

Check:

- requirement and acceptance-criteria coverage;
- grounding in current code, configuration, dependencies, and constraints;
- architecture, ownership boundaries, reuse, and unnecessary complexity;
- order, dependencies, prerequisites, rollout, and rollback;
- data migration, compatibility, concurrency, and partial-failure behavior;
- security, privacy, permissions, and trust boundaries;
- error handling, observability, and operational recovery;
- tests, fixtures, build checks, documentation, and cleanup;
- hidden assumptions, undefined decisions, scope creep, and premature detail;
- risks to existing behavior and user-owned changes; and
- at least one credible alternative for material design decisions.

Rethink the leading conclusion once. A plan that looks plausible on first read
may still sequence work incorrectly or omit validation.

## Synthesize

Compare the primary and independent reviews. Investigate disagreements against
the repository rather than choosing by vote.

Return:

```text
## Verdict
Ready | Ready with changes | Not ready

## Blocking findings

## Important improvements

## Minor clarifications

## Subagent review
- Agreements
- Additional findings
- Disagreements and resolution

## Corrected plan
```

Omit empty severity sections. Every finding must name the affected plan step,
explain the consequence, and propose a concrete correction. Preserve sound
parts of the original plan.

Provide a corrected plan when changes are needed and can be resolved from
available evidence. Otherwise list the exact decisions or evidence required.
Do not edit the plan file or begin implementation unless the user explicitly
asks.
