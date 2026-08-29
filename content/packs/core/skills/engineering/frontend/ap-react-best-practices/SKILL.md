---
name: ap-react-best-practices
description: Apply Vercel Engineering's React and Next.js performance guidance when writing, reviewing, debugging, or refactoring React components, Next.js routes, server or client data fetching, rendering behavior, bundles, and runtime performance. Use when React performance is material; do not invoke for purely visual styling work.
license: MIT
metadata:
  author: vercel
  version: "1.0.0"
  source: "https://github.com/vercel-labs/agent-skills"
  upstream_commit: "063bee94c3f4df8453406c830b0a7df0f2860278"
---

# React best practices

Apply the highest-impact relevant guidance from Vercel's React and Next.js
performance rules. Treat the rules as diagnostic guidance, not a mandate to
rewrite working code without evidence.

## Orient first

1. Inspect the installed React, Next.js, and related package versions.
2. Identify whether the code runs on the server, client, edge, or more than one
   runtime.
3. Read the relevant component, route, data flow, and build configuration.
4. Establish the observable performance or maintainability goal.

Use framework- and version-specific APIs only when the installed versions
support them. Preserve established architecture unless a rule addresses an
observed problem or the user requested a broader refactor.

## Prioritize by impact

| Priority | Category | Impact | Reference prefix |
| --- | --- | --- | --- |
| 1 | Eliminating waterfalls | Critical | `async-` |
| 2 | Bundle size optimization | Critical | `bundle-` |
| 3 | Server-side performance | High | `server-` |
| 4 | Client-side data fetching | Medium-high | `client-` |
| 5 | Re-render optimization | Medium | `rerender-` |
| 6 | Rendering performance | Medium | `rendering-` |
| 7 | JavaScript performance | Low-medium | `js-` |
| 8 | Advanced patterns | Low | `advanced-` |

Start with waterfalls and bundle cost when they plausibly dominate the result.
Do not spend complexity on a low-impact micro-optimization while a higher-impact
problem remains.

## Load only the relevant references

Read individual files under `references/` for rationale, incorrect and correct
examples, and source links:

- `async-*.md`: sequencing, parallelism, API routes, and Suspense streaming;
- `bundle-*.md`: imports, code splitting, conditional loading, and preload;
- `server-*.md`: authentication, caching, serialization, request isolation,
  and parallel server fetching;
- `client-*.md`: request deduplication, browser storage, and event listeners;
- `rerender-*.md`: state derivation, effect boundaries, memoization,
  transitions, and transient values;
- `rendering-*.md`: hydration, resource hints, SVGs, scripts, visibility, and
  loading states;
- `js-*.md`: measured JavaScript hot-path improvements; and
- `advanced-*.md`: specialized hook and lifecycle patterns.

For example, read
[references/async-parallel.md](references/async-parallel.md) when independent
work is awaited sequentially, or
[references/bundle-barrel-imports.md](references/bundle-barrel-imports.md) when
an import path may pull unnecessary modules into a bundle.

## Apply with judgment

- Verify a rule fits the actual runtime and installed APIs before changing code.
- Prefer the smallest change that removes the measured or strongly evidenced
  problem.
- Preserve correctness, accessibility, error handling, caching semantics, and
  request isolation.
- Do not introduce a dependency solely to demonstrate a pattern when the
  existing stack has a simpler equivalent.
- When reviewing, separate confirmed problems from conditional suggestions.

## Verify

Run the repository's relevant tests, type checks, lint, and build. For a
performance claim, use the project's profiler, bundle analyzer, browser
measurement, or another reproducible signal when available. Do not claim a
performance improvement from source inspection alone.

## Attribution

Adapted from Vercel's
[agent-skills](https://github.com/vercel-labs/agent-skills) at commit
`063bee94c3f4df8453406c830b0a7df0f2860278`. The upstream skill identifies
the work as MIT licensed.
