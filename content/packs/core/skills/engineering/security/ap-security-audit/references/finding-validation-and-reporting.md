# Finding validation and reporting

## Minimum finding bar

A vulnerability finding must answer:

1. **Attacker:** Who can attempt it, and what access or position do they start
   with?
2. **Control:** What input, identity, timing, or state can they influence?
3. **Path:** How does that influence reach the vulnerable operation through the
   actual code and deployed controls?
4. **Boundary:** What promised security boundary is crossed?
5. **Outcome:** What data, authority, execution, money, availability, or other
   concrete impact do they gain?
6. **Evidence:** Which code, configuration, test, runtime behavior, advisory, or
   specification supports each material claim?
7. **Counterevidence:** Which existing controls were checked, and why do they
   not prevent the attack?

If the path or outcome remains speculative, keep the item as an investigation
lead or hardening note rather than a vulnerability.

## Evidence states

- **Confirmed:** A safe controlled reproduction demonstrated the attack path
  and impact.
- **Strongly supported:** Source, configuration, and authoritative behavior
  establish the full path, but a dynamic reproduction was unnecessary or not
  safely available.
- **Deployment-dependent:** Source contains a dangerous path whose
  exploitability depends on an unverified gateway, platform, identity, or
  production setting.
- **Unverified lead:** Material assumptions remain. Do not place it in the main
  vulnerability list.

Confidence describes evidence quality; severity describes risk. Do not raise
severity merely because confidence is high.

## Severity

Judge severity from both likelihood and impact in this application's context:

- **Critical:** A realistic path to catastrophic compromise, such as
  unauthenticated arbitrary code execution, broad sensitive-data extraction,
  or control of the application's highest authority.
- **High:** A practical path to major data, execution, identity, financial, or
  authorization impact, including defeat of an important explicit permission
  boundary.
- **Medium:** Meaningful but constrained impact, access requirements, uncommon
  conditions, limited blast radius, or a targeted victim.
- **Low:** Confirmed security impact that is difficult to exploit or materially
  limited.

Do not assign vulnerability severity to general best-practice gaps. Put
valuable non-exploitable improvements under hardening.

State the assumptions that most affect likelihood or impact. Avoid numeric
scores unless the project requires a specific scoring system and its inputs can
be supported.

## Finding structure

Use this structure for each finding:

```text
### [Severity] Concise title

Status: Confirmed | Strongly supported | Deployment-dependent
Confidence: High | Medium | Low
Affected area:

Attack scenario:
Impact:
Evidence and data flow:
Existing controls and why they are insufficient:
Safe reproduction or validation:
Remediation direction:
Residual uncertainty:
```

Provide exact file locations and symbols where useful. Include exploit material
only to the level needed for authorized reproduction and remediation; redact
secrets and avoid unnecessarily weaponized instructions.

## Report structure

```text
# Security Audit

## Scope and limitations
## Architecture and threat summary
## Findings by severity
## Positive controls
## Hardening opportunities
## Coverage gaps and deployment checks
## Recommended next actions
```

Keep positive controls specific: describe what was inspected and why it appears
effective. Do not use them to imply that unreviewed areas are safe.

Order remediation by practical risk and shared root cause. Identify fixes that
remove several attack paths, but do not merge unrelated findings merely because
they touch the same file.
