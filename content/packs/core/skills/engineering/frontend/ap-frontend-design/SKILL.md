---
name: ap-frontend-design
description: Design and implement distinctive, production-ready web interfaces while preserving existing design systems. Use for new or redesigned websites, product interfaces, pages, components, dashboards, landing pages, and other frontend work where visual direction, styling, responsive behavior, interaction design, or UI polish is material.
---

# Frontend design

Create working interfaces with a deliberate visual identity. Ground every
choice in the product, audience, content, and repository rather than familiar
templates or fashionable defaults.

## Static prototype scope

When the request is for static HTML concepts or a coordinating skill supplies
prototype mode, treat the assigned concept directory as the design output
root. Use embedded styles/scripts and bundled relative assets that work when
the HTML file is opened directly, without the application or a backend.
Demonstrate interactions locally and identify demo-only operations. When
provided, follow `ap-implement-new-design`'s static HTML contract.

Read the application's design system as context, but keep all prototype code,
draft tokens, and `DESIGN.md` inside the concept directory. In this mode, the
design-contract and verification steps below apply to the prototype: do not
change app source, shared components, dependencies, deployment settings, or
root `DESIGN.md`, and do not run unrelated app builds. Verify the actual static
artifact at desktop/mobile widths and report direct-file/offline limits.
Prototypes are temporary previews, not public indexable pages. Application
integration requires the user's explicit request and uses the normal workflow.

## Orient before designing

1. Read the brief and relevant project documentation.
2. Inspect the actual frontend stack, dependencies, routes, components,
   styling approach, assets, and existing design tokens.
3. Read root `DESIGN.md` when it exists.
4. Classify the work:
   - **Extend:** Preserve the established system unless the request requires a
     new pattern.
   - **Redesign:** Identify what must remain recognizable and what may change.
   - **Greenfield:** Establish a coherent direction before producing code.

Do not turn a small component change into an unsolicited redesign. Do not
preserve an existing pattern blindly when it is the source of the problem.

## Establish an original direction

Define the interface's subject, audience, single most important job, emotional
tone, and technical constraints. Choose one memorable design idea and one
justified aesthetic risk. Derive them from the subject's real world—its
materials, language, artifacts, environments, or workflows—not from an
arbitrary style label.

For greenfield work or a substantial redesign, research current visual
references when web access is available:

1. Search using the subject, audience, desired feeling, and relevant cultural
   or material references.
2. Examine at least three visually distinct sources. A design-system catalog
   may be one source, but also consider real products, editorial design,
   signage, packaging, architecture, art, or other relevant fields.
3. For each source, identify one useful principle, one element to reject, and
   why it fits or conflicts with this project.
4. Synthesize a new direction. Do not reproduce a reference's layout, identity,
   or distinctive expression.

If browsing is unavailable, perform the same exercise from repository assets
and subject-specific knowledge. Never pretend research occurred.

Challenge the result before coding: if the direction could be applied to an
unrelated company with only the logo and copy changed, it is still too generic.
Revise it.

## Maintain the design contract

Every project receiving substantial frontend work should have a root
`DESIGN.md`. Read
[references/design-md.md](references/design-md.md) before creating,
reconstructing, or materially updating it.

- Create `DESIGN.md` during the first substantial frontend task if none exists.
- Treat its tokens as normative and its prose as the rationale for applying
  them.
- Keep it aligned with the implementation. Resolve unexplained conflicts
  instead of silently overwriting either side.
- Update it only when durable design-system decisions change, not for isolated
  copy edits or one-off layout adjustments.
- Record transformed reference influences in the overview when they materially
  shaped the direction; do not present references as a template to copy.

## Implement the system

Follow the repository's framework and conventions. Reuse existing primitives
and introduce shared tokens or components when they remove real duplication.
Avoid replacing a working design system with a new dependency for convenience.

Make intentional decisions about:

- **Typography:** Choose type for the product's voice and content. Establish a
  clear hierarchy, readable measures, deliberate weights, and purposeful
  pairings. A common typeface is acceptable when justified; an unusual one is
  not automatically distinctive.
- **Color:** Give colors semantic roles, maintain sufficient contrast, and use
  accents with discipline. Avoid default gradients and evenly distributed
  palettes that lack hierarchy.
- **Composition:** Let structure communicate information. Use grids,
  asymmetry, density, whitespace, dividers, numbering, and overlap only when
  they support the content.
- **Imagery and detail:** Prefer relevant assets, illustrations, diagrams, or
  textures over decorative filler. Do not invent meaningless visual noise.
- **Copy:** Use realistic, product-specific language. Avoid filler, vague
  marketing phrases, fabricated proof, statistics, customers, or testimonials.
- **Components:** Cover relevant default, hover, focus, active, selected,
  disabled, loading, empty, success, and error states.

Avoid repeated AI defaults: interchangeable card grids, gratuitous glass
effects, purple-on-white gradients, oversized metric heroes, arbitrary
numbered sections, excessive rounded containers, and decoration that could
belong to any product. These patterns are not forbidden; use them only when
the content and design direction justify them.

Match implementation complexity to the direction. Expressive designs may need
custom visuals or carefully orchestrated motion. Restrained designs demand
greater precision in typography, rhythm, alignment, and hierarchy—not less
design work.

## Preserve public discovery conditionally

When a page is public and intended to attract visitors through conventional or
AI-generated search, build discoverability into the implementation:

- use semantic rendered HTML and crawlable links for important content and
  navigation;
- give each indexable page an intentional URL, title, description, primary
  heading, canonical and robots behavior, and relevant internal links;
- ensure critical content and metadata survive the framework's rendering and
  deployment mode;
- include the page correctly in the site's sitemap or other established
  discovery mechanism;
- add only supported structured data that truthfully mirrors visible content;
- keep important entities, claims, dates, and product availability explicit and
  consistent; and
- preserve mobile usability, accessibility, and measured performance.

Use `ap-audit-seo` for a focused conventional search audit after substantial
work on a public site or indexable page. Use `ap-audit-geo` when visibility and
citations in AI-generated answers are a material product goal.

Do not apply search requirements to authenticated product surfaces, private
tools, temporary previews, or pages intentionally excluded from indexing.

## Interaction, responsive behavior, and accessibility

Make motion communicate feedback, orientation, focus, continuity, or state
change. Do not animate merely to make the page feel busy. Respect
`prefers-reduced-motion`, keep long motion interruptible, and prefer performant
properties such as `transform` and `opacity`.

Build around content rather than a fixed list of devices:

- Use fluid layouts, type, and spacing where appropriate.
- Choose breakpoints where the content needs them.
- Use container queries for reusable component-level adaptation when supported
  by the project.
- Prevent horizontal overflow, clipped text, distorted media, and mobile
  viewport-height failures.
- Provide usable touch targets, keyboard access, visible focus, semantic HTML,
  labels, and meaningful alternative text.
- Optimize media and avoid interaction or animation work that harms runtime
  responsiveness.

## Verify the rendered result

Do not declare frontend work complete from source inspection alone.

1. Run the project's relevant checks, tests, and build.
2. Run the interface and inspect the rendered result at a narrow/mobile width
   and a representative desktop width; add other widths when the layout or
   audience warrants them.
3. Exercise the important interactions and states.
4. Check overflow, clipping, hierarchy, spacing, contrast, focus, keyboard
   behavior, reduced motion, and browser-console errors.
5. Compare the implementation with the brief and `DESIGN.md`.
6. Fix issues and re-run the checks that exposed them.

Use the `ap-frontend-review` skill for a comprehensive audit when it is available.
If the runtime cannot render or inspect the interface, report that limitation
and do not claim visual verification.
