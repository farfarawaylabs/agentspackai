---
name: ap-design-polish
description: Polish an existing rendered web interface by removing unnecessary elements, reducing generic AI-style treatments, and tightening visual craft while preserving its chosen identity and working behavior. Use for final design cleanup, subtraction, reducing clutter or overdesign, or making an existing design feel more resolved. Honor audit-only requests without changing source.
---

# Polish a design

Make the existing direction clearer and more deliberate through subtraction
and focused refinement. Preserve the details that give it character. A dense,
playful, or maximalist interface can be well resolved; polish does not require
turning it into a sparse neutral template.

## Establish scope and evidence

Treat the full invocation as instructions, including pages, exclusions, and
elements the user wants to preserve. A request to polish authorizes focused
implementation. A request only to audit, critique, or suggest changes is
read-only; return evidence and proposed changes without editing source.

For a static HTML prototype, scope edits, assets, draft tokens, and design
notes to its supplied concept directory. Preserve direct-file/offline behavior
and use its local design brief. The application's source, dependencies, and
root `DESIGN.md` are context only and must remain unchanged. Verify the static
artifact and bundled assets instead of running unrelated application builds.
When provided by the implementing workflow, preserve its static HTML contract.

Read the brief, relevant project documentation, and `DESIGN.md` when present.
Inspect the interface and the source that controls the areas in scope. Identify
the audience, primary task, intended visual identity, and signature details
worth preserving. Reuse an established direction instead of reopening concept
exploration. If a proposed change requires a new direction or changes product
functionality, discuss it separately rather than treating it as polish.

Capture the current rendered interface at representative desktop and narrow
widths. Exercise the relevant interactions and states before deciding that an
element is redundant. A screenshot alone does not establish what a control,
label, status indicator, or repeated action does.

If only screenshots are available, provide a visual assessment and clearly
mark behavioral assumptions. If the interface cannot be rendered or inspected,
identify that limitation and use source inspection only for concrete cleanup
opportunities; do not assign a visual score or claim visual verification.

## Pass 1: Remove what does not earn its place

For each candidate, ask whether it contributes to comprehension, hierarchy,
identity, usability, or the intended emotional response. Judge its role in the
whole interface, including responsive and interactive states.

Look for:

- labels or explanatory copy that repeat information already clear nearby;
- nested containers, borders, backgrounds, and shadows signaling the same group;
- colors, weight changes, badges, and icons competing to emphasize one thing;
- decorative effects or imagery with no useful role in the chosen direction;
- repeated calls to action that interrupt the page rather than help navigation;
- empty space or dense clusters that weaken the intended reading rhythm; and
- custom controls whose visual treatment adds complexity without useful behavior.

Choose **keep**, **simplify**, **merge**, or **remove** for the few changes with
the greatest impact. Explain what becomes clearer and what must still work.
Do not manufacture a deletion quota. If an element earns its place, keep it.

Protect information and affordances users need: visible form labels,
accessible names, focus indicators, selected states, validation and recovery
messages, loading feedback, action consequences, required disclosures, and
navigation cues. Preserve meaningful heading structure and content. Reduce
redundant presentation without deleting the only explanation or action in a
mobile, empty, error, or keyboard-driven state.

Repeated calls to action may help on a long page; cards may express real
groups; texture or motion may carry the brand. Do not remove them merely
because they appear on a checklist. Reuse an established native or shared
control only when it preserves required behavior and fits the design.

## Pass 2: Resolve generic treatments and craft weaknesses

Read [references/ai-design-tells.md](references/ai-design-tells.md) for
contextual signals, useful counterexamples, and the score calibration.

Identify up to three strongest signals that make this interface feel generic
or overdesigned, with their locations and visible effect. Report fewer when
fewer are supported. Patterns are not defects by themselves, and their presence
does not establish who or what created the design.

Prefer the smallest correction within the chosen identity: consolidate
emphasis, simplify a grouping treatment, tighten type hierarchy, improve
alignment or image cropping, or remove a competing effect. Do not introduce
new decorative assets, a new font system, animation infrastructure, or a
replacement layout just to make the page seem less familiar.

## Apply a focused polish pass

In implementation mode, briefly state the intended edits and what gives the
design its identity, then proceed without another approval for ordinary
in-scope fixes. Address the highest-impact issues first. Use shared components
or tokens when the same issue repeats, checking their other usages before
changing them.

Remove imports, styles, wrappers, and assets made unused by the edits after
checking for other consumers. Do not just hide unwanted content with CSS when
it should be removed from the interface. Preserve semantics, focus order,
event handling, and responsive behavior when changing markup.

Use one deliberate polish pass followed by verification and repairs of any
regressions it introduced. Stop when the supported improvements are applied
or further changes would only express personal preference. Do not chase a
zero score through repeated stripping or expand this into a redesign loop.

Update existing design documentation only when durable rules changed. Local
spacing fixes or one-off copy edits do not need a new design-system document.

## Verify the actual result

Compare before and after at the same routes, viewport sizes, content, scroll
positions, and states. Check that subtraction improved hierarchy without
flattening the signature details. Re-exercise affected navigation, form labels,
keyboard focus, status/error feedback, and reduced motion where relevant.
Check narrow-screen overflow, clipping, readability, and browser-console errors.

In implementation mode, run the relevant project checks and build, repair
regressions caused by the changes, and recheck the affected views. Use
`ap-frontend-review` when a broader rendered audit is needed and available.
An improved appearance does not prove that functionality or accessibility
passed; report their evidence separately.

This skill does not require an independent critic. If the user requests one,
use a newly created `ap-design-critic` with no inherited conversation. Supply
only its role, the original visual brief, current visual artifacts, and
optional reference images. Exclude previous screenshots, critiques, scores,
implementation rationale, and this polish report. Never reuse an earlier
critic or tell it to forget its history. If isolated visual criticism is
unavailable, report that limitation without calling self-review independent.

## Report

Lead with what was improved, or proposed in audit mode, and why it matters.
Include:

- the elements removed, simplified, or deliberately preserved;
- up to three supported generic-design signals and their disposition;
- **AI-tell score: X/10**, a subjective genericness/overdesign assessment,
  with before and after only when both versions were actually inspected;
- links to the relevant before/after artifacts when available; and
- functional verification, remaining issues, and evidence limits.

Label the score as self-assessed unless a fresh independent critic supplied
it. Use the same scope and calibration for any before/after comparison; do
not imply scientific precision or proof of AI authorship. Report a single
current score for audit-only work, and no score when visual evidence is absent.
