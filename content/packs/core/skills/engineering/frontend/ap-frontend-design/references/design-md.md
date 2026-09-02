# DESIGN.md contract

Use this reference when creating, reconstructing, or materially changing a
root `DESIGN.md`.

For isolated static prototypes, "root" means the individual concept's output
directory. Keep draft rules there; do not promote an unselected concept into
the application's root design contract. Normal application integration uses
the repository's design contract after the user requests that integration.

`DESIGN.md` is the persistent contract between design intent and frontend
implementation. Follow Google's current `design.md` specification:
https://github.com/google-labs-code/design.md/blob/main/docs/spec.md

The format is currently `alpha`; verify the upstream specification before
making format-level changes.

## Lifecycle

### Existing document

Read it before designing. Confirm that its tokens and rationale still match the
implemented styles and components. Preserve intentional project-specific
extensions.

### Existing interface without a document

Reconstruct the document from evidence:

1. Inspect global styles, theme configuration, tokens, fonts, layout
   primitives, and representative components.
2. Distinguish repeated intentional rules from incidental one-off values.
3. Describe the system that actually exists before proposing improvements.
4. Record unresolved inconsistencies instead of inventing a false consensus.

### Greenfield interface

Create the document after establishing the visual direction and before the
system spreads across many components. Populate it with real decisions; do not
create empty boilerplate or speculative token families.

### Maintenance

Update the document when durable decisions change, such as palette roles,
typography, spacing rhythm, shape language, elevation, component conventions,
or design guardrails. Do not update it for local positioning, temporary
experiments, content-only edits, or exceptions that do not establish a rule.

## File structure

The optional YAML frontmatter contains machine-readable tokens. When present,
it starts and ends with a line containing exactly `---`. Supported top-level
fields are:

```yaml
version: alpha
name: <design-system-name>
description: <short-description>
colors:
  <token-name>: <valid-css-color>
typography:
  <token-name>:
    fontFamily: <family>
    fontSize: <dimension>
    fontWeight: <number>
    lineHeight: <dimension-or-number>
    letterSpacing: <dimension>
rounded:
  <scale-name>: <dimension>
spacing:
  <scale-name>: <dimension-or-number>
components:
  <component-name>:
    <property>: <literal-or-token-reference>
```

Use `px`, `em`, or `rem` for dimensions. Reference another token with
`{path.to.token}`. Component references may point to composite typography
tokens. Keep only groups and properties that represent implemented decisions.

Tokens are normative: application values must match them. Prose explains why
the values exist, how to combine them, and where exceptions apply.

## Markdown sections

Use `##` headings. Omit irrelevant sections, but keep the sections that are
present in this order:

1. `## Overview` (or `## Brand & Style`)
2. `## Colors`
3. `## Typography`
4. `## Layout` (or `## Layout & Spacing`)
5. `## Elevation & Depth` (or `## Elevation`)
6. `## Shapes`
7. `## Components`
8. `## Do's and Don'ts`

An optional `#` document title may precede them. Preserve unknown
project-specific sections, place them where they remain understandable, and
never create duplicate section headings.

Write the overview as an operational brief: audience, personality, emotional
goal, memorable idea, and the subject-specific rationale behind the visual
language. If external references materially influenced the work, record the
principles transformed from them and how the result differs; do not make the
system depend on inaccessible screenshots or links.

Describe component behavior and relevant states, not merely appearance.
Guardrails should be concrete enough to reject an incorrect implementation.

## Reconciliation and validation

When code and `DESIGN.md` disagree:

1. Inspect history and repeated usage where available.
2. Determine whether the code drifted, the document is stale, or both express
   a legitimate exception.
3. Correct the stale side and verify representative components.
4. Tell the user when the intended source of truth cannot be determined.

When network/package access is permitted, validate the result with:

```sh
npx @google/design.md lint DESIGN.md
```

Treat lint errors as failures. Review warnings rather than suppressing them
blindly. Because the specification is still alpha, re-check the current
upstream documentation when the command or schema behaves differently.
