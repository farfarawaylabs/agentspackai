---
name: ap-react-composition-patterns
description: Apply Vercel Engineering's scalable React composition patterns when refactoring boolean-prop proliferation, designing reusable component APIs, building compound components, lifting shared state, defining context interfaces, or choosing children and explicit variants. Includes React 19 guidance that must be gated by the installed React version.
license: MIT
metadata:
  author: vercel
  version: "1.0.0"
  source: "https://github.com/vercel-labs/agent-skills"
  upstream_commit: "063bee94c3f4df8453406c830b0a7df0f2860278"
---

# React composition patterns

Build flexible React components through composition, explicit variants, and
well-defined state boundaries. Use these patterns when they make an API easier
to understand and extend; do not replace a small, clear prop interface with a
compound abstraction that adds more machinery than value.

## Orient first

1. Inspect the installed React version and the repository's component
   conventions.
2. Identify the consumers, supported variants, state owner, and extension
   points of the component.
3. Distinguish real boolean-prop proliferation from a few independent flags
   that remain the clearest API.
4. Preserve existing public behavior unless the user explicitly accepts a
   migration.

## Prioritize by problem

| Problem | Preferred direction | References |
| --- | --- | --- |
| Mode and feature booleans create invalid combinations | Explicit variant components and composition | `architecture-*.md`, `patterns-explicit-variants.md` |
| Related parts need shared state and actions | Compound components over a stable context interface | `architecture-compound-components.md`, `state-context-interface.md` |
| State implementation leaks into child components | Decouple the provider from the interface | `state-decouple-implementation.md` |
| Siblings need coordinated state | Lift state into a provider at the common boundary | `state-lift-state.md` |
| A render prop only passes through presentational content | Prefer children composition | `patterns-children-over-render-props.md` |
| React 19 changes affect refs or context consumption | Apply only on React 19 or newer | `react19-no-forwardref.md` |

Read the specific files under `references/` before applying a pattern. Each
contains rationale, contrasting code examples, and source links.

## Design the API

- Make supported variants explicit and make invalid combinations difficult to
  express.
- Keep the shared context contract focused on state, actions, and metadata that
  consumers genuinely need.
- Let the provider own the storage mechanism so children depend on behavior,
  not implementation.
- Prefer normal JSX composition and children when it communicates structure
  directly.
- Keep simple components simple. Composition is a tool for real variability,
  coordination, or extensibility.
- Plan a migration when changing an exported component API; do not silently
  break consumers.

## React version boundary

Read
[references/react19-no-forwardref.md](references/react19-no-forwardref.md) only
after confirming React 19 or newer. Do not apply React 19 APIs or migration
advice to React 18 and earlier.

## Verify

Run the repository's relevant tests, type checks, lint, and build. Exercise each
supported variant and shared-state interaction. Confirm that the new API removes
invalid combinations or duplication without obscuring common usage.

## Attribution

Adapted from Vercel's
[agent-skills](https://github.com/vercel-labs/agent-skills) at commit
`063bee94c3f4df8453406c830b0a7df0f2860278`. The upstream skill identifies
the work as MIT licensed.
