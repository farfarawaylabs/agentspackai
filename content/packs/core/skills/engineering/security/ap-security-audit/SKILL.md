---
name: ap-security-audit
description: Perform a read-only, evidence-based security audit of an application, API, service, CLI, library, infrastructure configuration, or code change. Use when the user asks for a security audit, vulnerability assessment, threat review, penetration-oriented source review, authentication or authorization review, supply-chain review, secrets review, or validation of suspected exploitable security weaknesses. Do not use for ordinary input validation or a single known bug unless a broader adversarial review is requested.
---

# Security Audit

Find security weaknesses that have a credible attack path and meaningful
impact. Do not inflate a checklist of missing hardening controls into a
vulnerability report.

## Operate safely

Audit mode is read-only by default. Do not change code, dependencies,
configuration, accounts, or infrastructure unless the user separately asks for
remediation.

Do not:

- attack production or third-party systems;
- access or alter data beyond the authorized test scope;
- create persistence, evade monitoring, exfiltrate secrets, or cause denial of
  service;
- publish vulnerability details or contact maintainers; or
- run intrusive scanners, fuzzers, or proof-of-concept payloads against a live
  target without explicit authorization.

Prefer source analysis and controlled local or sandbox verification. Redact
credentials, tokens, personal data, and sensitive exploit details from logs and
shared artifacts.

## Establish scope and threat model

1. Confirm the repository, change, deployed surface, environment, identities,
   and exclusions in scope.
2. Read repository instructions, architecture, deployment configuration,
   dependencies and lockfiles, schemas, routes, permissions, tests, and
   security documentation.
3. Map entry points, trust boundaries, privileged operations, sensitive data,
   external dependencies, execution contexts, and security controls.
4. Identify realistic attackers, their starting access, valuable assets, and
   the boundaries they should not cross.
5. Note important controls supplied outside the repository, such as gateways,
   identity providers, secret stores, platform isolation, or CDN rules. Verify
   them when possible; otherwise preserve the uncertainty.

Use the application's actual deployment and trust model. Designed administrator
capabilities are not vulnerabilities merely because they are powerful.

## Prioritize the attack surface

Read
[references/audit-surfaces.md](references/audit-surfaces.md)
and select the relevant areas. Start with exposed and high-impact paths rather
than distributing attention evenly.

Trace attacker-controlled data and identity through parsing, authorization,
business rules, persistence, rendering, outbound requests, jobs, and privileged
sinks. Include business-logic and state-machine abuse; do not stop after
checking common injection classes.

Use current official advisories and documentation for dependency, framework,
runtime, protocol, cloud, and AI-provider behavior. Cross-check every claim
against the versions and configuration the repository actually uses.

## Hunt and validate

For each candidate weakness:

1. Describe the attacker, required access, controllable input or state, path
   through the system, violated boundary, and concrete outcome.
2. Trace the complete code and configuration path. Look for upstream
   validation, authorization, escaping, isolation, or deployment controls that
   may prevent exploitation.
3. Test assumptions about parsers, runtimes, query builders, browsers, proxies,
   caches, and protocols against official behavior or a safe minimal harness.
4. Attempt to disprove the finding and consider a benign explanation.
5. Confirm dynamically in a controlled environment when safe and
   proportionate. Never treat a destructive or unauthorized demonstration as
   necessary proof.
6. Distinguish confirmed, strongly supported, deployment-dependent, and
   unverified claims.

Read
[references/finding-validation-and-reporting.md](references/finding-validation-and-reporting.md)
before assigning severity or reporting findings.

Do not report:

- theoretical danger without a plausible end-to-end attack;
- defense-in-depth advice as an exploitable vulnerability;
- a dependency advisory without confirming the affected version and reachable
  behavior;
- a missing application control that is demonstrably owned by another layer;
- normal product behavior outside a stated security boundary; or
- duplicates that share one root cause and remediation.

Record useful hardening opportunities separately and keep them proportional to
their actual value.

## Report, then remediate only when requested

Return a prioritized report with scope, architecture and threat summary,
validated findings, positive controls, hardening notes, coverage gaps, and
recommended next actions. For each finding include evidence, attack scenario,
impact, likelihood, severity, confidence, affected locations, and a focused
remediation direction.

If the user requests fixes, agree on the findings in scope, make the smallest
coherent corrections, add regression tests for the attack path, and rerun both
security-specific verification and the repository's normal checks. Use
`ap-debug`, `ap-validate-trust-boundaries`, or
`ap-handle-errors-reliably` when their focused workflows apply.

Never claim the application is secure or the audit is complete. State what was
not reviewed, could not be verified, or still requires deployment testing.
