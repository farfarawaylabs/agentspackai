---
name: ap-implement-new-design
description: Build a chosen visual direction as a static HTML prototype or integrate it into an application, then refine it through bounded fresh visual critique. Use for bringing design concepts to life, standalone design previews, or implementing a selected prototype in the real product. Honor the requested output mode; explore first when no direction is clear.
---

# Implement a new design

Carry a chosen direction through implementation, rendered critique, targeted
refinement, and functional verification. The implementing agent retains the
working context; every critic starts with a completely fresh context.

## Choose the output mode

- **Static prototype:** Use for standalone HTML, mockups, concept previews,
  and Studio's prototype stage. Read
  [references/static-html.md](references/static-html.md). Build only inside
  the assigned concept directory; leave application files and root
  `DESIGN.md` unchanged. Each concept has its own draft design notes.
- **Application:** Use when the user asks to build or change the actual site
  or product. Follow its framework, components, routes, and design contract.
  When integrating a selected prototype, use it as a visual reference and
  replace demo behavior with the real application behavior.

Preserve the mode passed by the user or coordinating workflow. A request to
implement several concepts for comparison remains prototype work; choosing a
favorite does not switch modes. A standalone request to change an existing
site retains application behavior. Resolve a materially ambiguous destination
before touching application source.

## Establish the direction

Read the full invocation, relevant project documentation, existing interface,
and `DESIGN.md` when present. Preserve the requested scope and constraints.
Accept a direction from prior exploration, supplied references, an established
design system, or a sufficiently clear description. Do not require the user to
run another skill or reconfirm a direction they already chose.

If the direction is unclear, use `ap-explore-design-directions` when available.
Otherwise present three concrete concepts that differ in composition,
typography, imagery, or interaction logic, grounded in the product. Respect a
different requested count. Stop for the user to choose, combine, or refine
them before editing application source. Resume implementation after their
choice without asking for the same approval again.

When the user or Studio already requested a batch of built static concepts,
use the exploration briefs as inputs for each prototype instead of requiring
a favorite first. Honor an explicitly requested earlier checkpoint. Refine
each concept against its own brief; never reuse a critic across concepts.

Before implementation, establish a concise visual brief containing:

- the product, audience, and primary user task;
- the chosen direction, intended feeling, and signature visual idea;
- required content, brand constraints, and explicit exclusions;
- relevant pages, states, and desktop/mobile coverage; and
- optional reference images as a quality baseline, not a layout to copy.

Keep this brief stable throughout refinement. A critic's opinion does not
authorize a new direction. If a material direction change is needed, discuss
it with the user, then update the brief. Do not reset the iteration budget
silently when the brief changes.

## Prepare implementation and review

Use the installed `ap-frontend-design` skill for implementation and the
`DESIGN.md` contract. If unavailable, follow the repository's frontend
conventions, preserve its design system, and record durable design decisions
in the existing design documentation. Avoid duplicating frontend guidance.
Pass the output mode and exact concept directory when using this skill;
prototype conventions take precedence over application integration steps.

Check that the environment can render the interface, capture visual artifacts,
and dispatch a visual-capable critic with no inherited conversation. Use
`ap-design-critic` when available. If the role is not directly callable but its
installed instructions are accessible, give those instructions to a new
generic read-only subagent. Do not invent an unavailable role or model.

If visual inspection, the critic instructions, or fresh-context dispatch is
unavailable, explain the specific limitation. Continue authorized
implementation and available checks, but leave independent critique incomplete.
Self-review or telling an existing agent to forget its history is not a
substitute. Do not install components or launch external services merely to
hide a missing capability.

Set defaults unless the user specifies otherwise:

- target overall visual score: **8.5/10**;
- maximum improvement rounds after the initial implementation: **3**.

These limits apply per concept unless an explicit total budget was supplied.
Use a coordinator's assigned remaining budget instead of resetting defaults.
This permits an initial assessment and up to three implement-and-assess rounds.
State the budget to the user. Keep the target, round count, and stopping rules
in the implementing agent's context only; never send them to the critic.

## Build and capture the initial result

Build the complete in-scope interface in the selected output mode. Preserve
working behavior and use realistic content. Consider generated imagery or
motion when it materially strengthens the concept, using available tools and
the user's existing permissions and budget. Keep the experience usable when
motion is reduced or assets are loading.

Run checks relevant to that mode and exercise the primary interactions before
capturing the result. Fix known functional or rendering failures instead of
spending a critique on a broken preview.
For static prototypes, verify the HTML contract rather than installing or
building the real application. Keep an existing application Git diff unchanged.

Capture representative desktop and narrow/mobile views. Keep routes, viewport
sizes, content, scroll positions, and interaction states comparable across
assessments. Include frames or clips when motion is material; a still image
cannot verify transitions. Avoid selecting only the flattering parts of the
interface.

## Dispatch a completely fresh critic

Read [references/critic-prompt.md](references/critic-prompt.md) before the first
dispatch. Use its fixed prompt for every assessment; only replace the current
visual artifacts. The brief and reference baseline stay fixed unless the user
changes the direction.

For **every** critique, including retries and final reassessments:

1. Create a new subagent identity and conversation. Disable parent-history
   inheritance, context forks, session resumption, and automatic handoff
   summaries using the host's available controls. A new agent ID with copied
   history is not a fresh critic. Never reuse or follow up with a past critic.
2. Supply only the critic's role instructions, the fixed assessment prompt,
   the concise visual brief, current screenshots/frames, and optional fixed
   reference images. Use neutral artifact names such as `desktop.png` and
   `mobile.png`, not names containing scores, fixes, or round numbers.
3. Exclude the parent conversation, this orchestration skill, source code,
   full `DESIGN.md`, implementation rationale, task ledger, previous designs,
   earlier critiques or scores, changes made, target score, and remaining
   budget. Do not ask whether a previous problem is now fixed.
4. Give read-only access where supported. Direct the critic to inspect only
   the supplied visual artifacts, without browsing the repository or memory
   for more context. Do not disable host policies or repository safeguards to
   obtain isolation. If unavoidable inherited context contains implementation
   history or prior feedback, the fresh-context requirement is unmet.
5. Wait for the assessment to finish before changing the interface. Confirm
   the critic could inspect the supplied visuals. A verdict based on unseen
   artifacts or contaminated context is invalid; fix the dispatch and use a
   new critic. If the limitation persists, stop critique and report it.

The critic should judge the current result against the brief using its normal
scorecard, identify the three highest-impact improvements, and state what to
preserve. Never coach the critic toward a passing score or cherry-pick scores
by asking multiple critics to rescore an unchanged design.

## Refine within the budget

After each valid assessment, the implementing agent decides what to do:

- **Target reached:** stop visual refinement and proceed to final verification.
- **Budget exhausted:** stop and report the current result and remaining gaps,
  even when the target was missed.
- **No meaningful progress:** stop when the remaining feedback repeats already
  addressed concerns without visible benefit or would require abandoning the
  chosen direction. Treat scores as subjective signals; do not use a tiny
  numerical difference as proof of improvement or regression.
- **Otherwise:** address the critic's highest-impact findings in one focused
  round, then run the affected checks, capture the current interface, and
  dispatch a completely fresh critic.

Assess suggestions against the brief and functional requirements. Preserve
the elements the critic identified as working. Reject advice that would harm
usability or contradict the user's choices, and record the reason for the
user; do not send that defense to the next critic.

Retain the artifacts and a compact implementation-side record of each
assessment, changes, score, and stopping decision using the project's existing
artifact or task conventions. Keep that record out of critic inputs. On
resumption, recover the remaining budget from it instead of starting over.

## Verify and hand off

Visual scores and functional verification are separate outcomes. Pass the
output mode and exact artifact/application scope to
`ap-frontend-review` when available, or the project's equivalent checks, to
verify the final interface at representative widths and exercise relevant
navigation, keyboard access, focus, reduced motion, loading/error states, and
browser-console behavior. In application mode, run the standard project checks
and build when available, and reconcile durable decisions with root `DESIGN.md`.
In prototype mode, verify direct-file/offline opening and portable assets;
keep design documentation and all fixes scoped to the concept directory.
Honor an explicit no-further-edits instruction from the user or coordinator:
perform subsequent verification in audit-only mode and report unresolved
defects, including functional ones, without modifying the frozen output.

Prefer doing these checks before each assessment so the last critique covers
the final local result. If final fixes change its appearance, capture it
again and obtain a fresh assessment within the remaining budget. If none
remains, report the last score as belonging to the earlier version and mark
the final visual result unassessed. When edits remain authorized, do not skip
required functional fixes merely to retain a visual score. Do not silently
extend the loop or override an explicit freeze.

When Studio requests only a final assessment after polish, reuse the fixed
critic prompt and fresh dispatch procedure above against the current visuals.
Do not rebuild, re-explore, or restart refinement. Charge it to the reserved
assessment budget and return its result to the coordinator.

Report the implemented direction, preview/artifact locations, meaningful
refinements, final applicable visual verdict, number of improvement rounds,
and why refinement stopped. Separately report functional checks and any
limitations or remaining gaps. A below-target score is an honest bounded
outcome, not permission for unlimited work. Publication and deployment follow
the user's normal authorization; they are not part of this skill by default.
