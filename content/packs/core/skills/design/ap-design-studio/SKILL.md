---
name: ap-design-studio
description: Lead a complete design exploration through shareable static HTML prototypes by using the exploration, implementation, critique, polish, and frontend review skills in sequence. Use when the user wants several fully realized design options or an end-to-end design studio workflow. Default to three prototypes; accept counts, references, constraints, and checkpoints in natural language. Integrate a selected design into the actual product only when requested explicitly.
---

# Design studio

Guide the user from a brief to distinct, polished HTML designs they can open,
compare, and share with their team. Use the existing specialist skills for
each stage; this skill owns sequencing, handoffs, budgets, and the final
selection checkpoint. The individual skills remain usable on their own.

## Read the whole request

Default to **three completed static HTML concepts**. Honor additional details
after the skill name, including count, audience, content, references, brand
constraints, exclusions, output location, and requests to pause at a stage.

- Interpret numbers tied to concepts, options, designs, or variants, not
  prices, product versions, or dates. Follow the most recent explicit count.
- A request for "four concepts" means four built prototypes, not four written
  descriptions followed by one implementation.
- If the user distinguishes exploration and build counts, honor both. Pause
  for their shortlist when requested; otherwise choose a varied subset to
  build and state which directions it includes.
- Reuse specifically supplied or selected directions. Do not invent additional
  concepts just to reach the default count when the user asks to work on one.
- Honor "ideas only", "audit only", and "show me the concepts before building"
  as scope limits. Otherwise proceed from exploration into prototype building
  without an extra approval checkpoint.

Static prototypes are the default even inside an existing application's
repository. "Implement four concepts" does not authorize changing that
application. "Integrate concept two into our actual site" does. A preference
such as "I love concept two" selects a direction; it does not authorize product
integration or deployment.

## Prepare the run

Read relevant project and brand context. Establish one product/content brief
and comparable page coverage for all concepts. Avoid repeatedly asking for
information already supplied. Use realistic, approved content; distinguish
demonstration data from actual product claims.

Locate and read each specialist's instructions when reaching its stage:

- `ap-explore-design-directions` for differentiated concept briefs;
- `ap-implement-new-design` for building and bounded critique, using its
  static-prototype mode and bundled static HTML contract;
- `ap-frontend-design`, used by implementation for visual execution;
- `ap-design-polish` for a focused subtraction pass;
- `ap-frontend-review` for rendered and functional verification; and
- `ap-design-critic` for fresh independent visual assessments.

Do not assume installing Studio installed these optional components. If a
required skill is missing, report the exact missing component and use the
normal Agents Pack management workflow when installation is authorized.
Complete available stages without claiming the missing ones ran. Do not
duplicate missing skills inside this one. If the main implementation skill is
missing, deliver the available brief/concepts and explain what is needed to
continue. Unavailable browser or isolated-critic capabilities must be reported
separately from missing installed content.

Choose a new output directory outside the application source/build/public
trees, following the project's artifact conventions. Otherwise use
`design-prototypes/<unique-run>/`. Do not overwrite prior runs. Assign each
concept its own subdirectory and pass the exact path to every stage. All
prototype edits and draft design notes belong there; application source,
configuration, dependencies, and root `DESIGN.md` remain unchanged.

Use the implementing skill's existing progress record to retain concept
briefs, output paths, stage completion, assessments, and remaining budget.
Keep review history separate from the shareable pages. On resumption, continue
unfinished stages instead of rebuilding completed concepts or resetting caps.

State the planned count and per-concept budget before building. By default,
each concept gets an initial build/assessment, up to two critique-driven
revision rounds targeting 8.5/10, and one polish pass followed by final
verification and assessment. This allows at most four valid assessments per
concept. The polish pass is the third refinement opportunity, not the start
of another loop. Do not rescore unchanged pages just to get a better score.

Respect requested limits across the entire process. Reserve one permitted
refinement for polish when possible. With zero refinements, complete the
initial build and its checks, then freeze the prototype: pass an explicit
"no further edits; report remaining defects" instruction to implementation's
final verification, polish, and frontend review. Those later stages are
read-only even if they find functional defects. An explicit total budget
applies across concepts, not once
per concept. Report limits honestly instead of silently reducing the requested
concept count or multiplying the budget. Never send budgets or targets to a
critic.

## Run the specialist stages

1. **Explore.** Use `ap-explore-design-directions` with the product brief,
   requested count, and user qualifiers. State that the user requested built
   static concepts and that these briefs will go to the prototype stage.
   Receive all direction briefs; do not have the explorer implement pages.
   Unless an earlier checkpoint was requested, carry the directions forward.
2. **Build each concept.** Use `ap-implement-new-design` in static-prototype
   mode with that concept's brief, output directory, common content/coverage,
   and the assigned refinement budget. It uses `ap-frontend-design` and
   handles rendered critique. Keep concepts structurally distinct instead of
   producing palette swaps. Do not apply one concept's visual choices to all
   the others.
3. **Polish each concept.** Use `ap-design-polish` on that concept's prototype
   only, passing its identity and details to preserve. Use audit-only mode
   when the user disallows further edits or the refinement budget is spent.
4. **Verify each final prototype.** Use `ap-frontend-review` in fix mode with
   the static artifact as its scope, or audit-only mode when edits are frozen.
   Repair in-scope regressions where authorized; verify
   direct-file opening, responsive behavior, local interactions, and bundled
   assets using the implementation skill's static HTML contract. Reuse fresh
   verification evidence for unchanged views; do not rerun unrelated app
   checks.
5. **Assess the final visuals.** If polish or functional repairs changed the
   assessed appearance, dispatch a new `ap-design-critic` using the fixed
   prompt and fresh-context procedure in `ap-implement-new-design`. Use the
   reserved final assessment; do not invoke a new implementation loop. If
   appearance is unchanged, retain its applicable assessment. Report a
   below-target or unavailable result without silently starting more rounds.

The same implementing agent may coordinate these stages sequentially. Every
critic, for every concept and iteration, needs a new conversation with no
inherited history. Send only the role, fixed assessment prompt, that concept's
brief, current visuals, and optional fixed references. Exclude other concepts,
the comparison gallery, prior screenshots, feedback, scores, and implementation
rationale. Reuse the existing dispatch procedure rather than making another
critic rubric. Keep studio-quality scores separate from polish's subjective
AI-tell assessments.

## Package and let the user choose

Create a simple `index.html` at the run root with relative links to every
concept, a short neutral description, and previews when available. Link each
concept to its own page; do not insert comparison controls into the concept
designs themselves. Present every requested option without selecting a winner
from critic scores. The gallery is a comparison aid, not another concept.

Use the implementation skill's static HTML contract for sharing. Provide each
concept's HTML file or self-contained folder, and a ZIP of the gallery and
required assets when the result spans files. Exclude internal critic history,
unrelated repository files, credentials, and dependencies. Include concise
opening instructions and identify demo-only behavior. Verify relative links
and opening a copied/extracted package outside the source location when tools
permit; disclose unverified portability rather than claiming it.

Return the files, concise differences, verification and capability limits,
and any remaining design gaps. Invite the user to choose, combine details, or
request further prototype refinement. This is the default taste checkpoint.
Do not publish or send the files to teammates without authorization.

## Integrate only when requested

When the user explicitly requests application integration, use
`ap-implement-new-design` in application mode with the chosen prototype,
requested combinations, and accumulated user preferences. Read the actual
framework, routes, components, and design contract; translate the design into
that architecture rather than copying a standalone HTML file over the app.
Replace demo interactions/data with the appropriate product behavior and run
the application's checks. Preserve the prototypes as references. Selection
alone never triggers this stage, and integration does not imply deployment.
