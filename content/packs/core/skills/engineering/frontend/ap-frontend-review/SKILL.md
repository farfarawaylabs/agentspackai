---
name: ap-frontend-review
description: Audit and verify rendered web interfaces for visual quality, responsive behavior, interaction states, accessibility, design-system consistency, and runtime problems. Use when the user asks to review, critique, inspect, QA, or fix a website or UI, or when substantial frontend implementation needs an evidence-based final visual check.
---

# Frontend review

Review the rendered interface, not only its source. Tie every finding to
observable evidence and distinguish an actual defect from a subjective
preference.

## Select the mode

- **Audit mode is the default.** Inspect and report; do not change source files.
- **Fix mode applies only when the user explicitly asks to fix or improve the
  interface.** Inspect, make focused changes, and re-verify them.

If the request is ambiguous, complete the read-only audit first. Do not broaden
a visual review into an unsolicited redesign.

## Establish scope

For a static HTML concept, the supplied prototype directory is the review and
fix boundary. Use its brief and local design notes, inspect the actual HTML
file at desktop/mobile widths, and test direct-file/offline opening and
relative assets. Do not start, build, or modify the real application to review
a prototype. Treat declared demo interactions as demos; verify their local
behavior without expecting backend integration or inventing live submissions.
Report direct-file or offline checks that the browser tools cannot perform.
The project/build references below apply to that artifact's scope in this mode.

1. Identify the pages, flows, components, states, and viewports in scope.
2. Read relevant project documentation and root `DESIGN.md`.
3. Inspect the framework, styling method, tokens, component system, routes,
   scripts, and test setup before attributing a rendered problem to source.
4. Obtain or start a suitable local preview when authorized. Prefer the
   repository's documented command.
5. Note anything that cannot be exercised, including authentication, missing
   data, unavailable services, or absent browser tooling.

If no URL is supplied but the repository exposes a clear preview command, use
it. Ask for a URL or setup detail only when it cannot be discovered safely.

## Inspect systematically

Read [references/review-checklist.md](references/review-checklist.md) for a
comprehensive audit.

Use browser inspection when available:

1. Capture the initial rendered state before interacting.
2. Inspect representative desktop and narrow/mobile widths. Add intermediate
   or wide widths where layout transitions warrant them.
3. Exercise primary navigation and important interactions.
4. Inspect loading, empty, error, disabled, selected, expanded, hover, focus,
   and success states when relevant and reachable.
5. Test keyboard operation and reduced motion.
6. Review DOM semantics and browser-console errors alongside screenshots.
7. Stress likely failure cases such as long text, sparse data, dense data,
   missing media, and constrained width when the application permits it.

Do not infer that an interaction works from its appearance. Do not infer visual
quality from a DOM snapshot alone.

## Report evidence

Prioritize findings:

- **P1:** Blocks use, hides content, causes serious accessibility failure, or
  breaks a primary flow.
- **P2:** Materially harms comprehension, responsiveness, consistency, or
  interaction quality.
- **P3:** Minor polish or maintainability issue with limited user impact.

For each finding, state:

- priority and concise title;
- page, state, and viewport;
- observed evidence;
- expected behavior or violated project rule;
- likely source area when supported by evidence;
- confidence or remaining uncertainty.

Separate verified defects from optional design opportunities. Group repeated
instances of the same systemic problem instead of producing a noisy list.
Include screenshots or other captured evidence when the available tools support
it.

## Apply fixes only in fix mode

1. Fix P1 issues before lower-priority polish.
2. Trace the rendered symptom to the relevant source, token, component, data,
   or configuration.
3. Make the smallest coherent fix that follows repository patterns. Prefer a
   shared correction when repeated defects have one cause.
4. Preserve intentional design decisions. If a fix requires a new design
   decision, explain the tradeoff rather than hiding it in code.
5. Update `DESIGN.md` only when the fix changes a durable system rule.

Do not add a dependency, replace the design system, or rewrite a component
architecture merely to simplify the review.

## Re-verify

After each meaningful fix:

1. Reproduce the original page, state, and viewport.
2. Confirm the observed defect is gone.
3. Recheck adjacent states and responsive widths for regressions.
4. Review console output and relevant automated checks.
5. Run the repository's standard frontend tests and build when available.

Continue until in-scope P1 and P2 findings are resolved or a concrete blocker
remains. Report unresolved findings and limitations honestly. Never claim a
visual pass when the interface could not be rendered or inspected.
