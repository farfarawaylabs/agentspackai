---
name: ap-test-web-app
description: Exercise a running web application in a real browser and report or, when requested, fix reproducible functional failures. Use for web-app QA, changed-route testing, end-to-end smoke tests, broken user flows, forms, navigation, loading and error states, browser-console or network failures, responsive functional behavior, or requests to verify that a web implementation works. Use ap-frontend-review instead for primarily visual, design-system, or aesthetic critique.
---

# Test a Web App

Test observable user behavior in the rendered application. Source inspection
can guide the test, but it cannot prove that a browser flow works.

## Select the mode

- **Audit mode is the default.** Exercise the application and report findings
  without changing source.
- **Fix mode applies only when the user asks to fix the failures.** Reproduce,
  trace, correct, and re-test each authorized issue.

Do not perform destructive actions against production, use real customer data,
send real messages or payments, or change third-party state without explicit
authorization.

## Establish the test surface

1. Read the request, repository instructions, relevant product and technical
   documentation, test setup, routes, and recent diff when available.
2. Identify the affected pages, user roles, primary flows, important states,
   supported viewports, and expected outcomes.
3. Find an existing application URL or use the repository's documented local
   preview command. Reuse a healthy server rather than starting duplicates.
4. Confirm required services, seed data, test credentials, feature flags, and
   environment assumptions without exposing secrets.
5. Choose a proportionate scope:
   - **Focused:** one reported flow or failure;
   - **Change-aware:** routes and behaviors affected by the current change;
   - **Smoke:** critical application journeys; or
   - **Broad:** wider exploratory coverage explicitly requested by the user.

State blocked or unavailable areas. Do not quietly substitute source review for
browser testing.

## Reconnoiter before acting

Open each in-scope page and inspect its rendered structure, visible state,
available controls, console, and relevant network activity before automating a
long sequence. Learn what the current application exposes rather than assuming
selectors, routes, or state from source alone.

Capture a baseline for a reported regression or a change-aware review when a
meaningful before state is available.

## Exercise real user behavior

Test the relevant combinations of:

- initial load, refresh, navigation, browser history, and deep links;
- primary actions, forms, validation, cancellation, and repeated submission;
- loading, empty, error, partial, success, disabled, and permission states;
- authentication and authorization boundaries using approved test identities;
- slow, failed, malformed, or missing responses when the environment supports
  controlled simulation;
- keyboard operation for primary flows;
- narrow/mobile and representative desktop widths where behavior changes; and
- persistence across reloads or sessions when the feature promises it.

Observe rendered results, URL and history changes, focus, console errors,
uncaught exceptions, failed requests, response status, and duplicate effects.
Do not infer success from a click completing or a request returning alone.

## Confirm failures with evidence

For each suspected defect:

1. Return to a known starting state.
2. Repeat the shortest reproduction when deterministic behavior is expected.
3. If it is intermittent, record attempts, frequency, timing, and state rather
   than presenting it as deterministic.
4. Capture precise steps, expected and actual behavior, route, role, viewport,
   console or network evidence, and screenshots when useful.
5. Inspect enough source and configuration to identify a likely responsible
   area, but label unproven causes as hypotheses.

Ignore unrelated pre-existing console noise unless it affects the tested flow.
Group repeated manifestations of one underlying failure.

## Fix only in fix mode

Use `ap-debug` for non-obvious root-cause investigation. Make focused changes
that follow repository architecture and reuse existing components and test
utilities.

After each fix:

1. Repeat the exact failing steps.
2. Exercise the nearest success, failure, and boundary states.
3. Add or update an automated regression test when the repository supports a
   stable test at the appropriate level.
4. Run the relevant automated suite and build.
5. Recheck console and network behavior.

Do not weaken an assertion, bypass validation, add arbitrary waits, or replace a
real user interaction with an implementation-detail test merely to make a test
pass.

## Report results

Return:

```text
## Scope and environment

## Passed flows

## Findings
- Severity and title
- Reproduction
- Expected and actual behavior
- Evidence
- Likely source area and confidence

## Fixes and verification

## Coverage gaps
```

Omit empty sections. Separate confirmed failures from observations and optional
improvements. Never claim complete application coverage or a passing browser
test when important flows could not be exercised.
