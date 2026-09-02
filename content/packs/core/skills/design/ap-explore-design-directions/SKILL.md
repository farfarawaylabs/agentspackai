---
name: ap-explore-design-directions
description: Explore multiple genuinely distinct visual directions before implementation. Use when the user wants design concepts, creative directions, visual options, aesthetic exploration, or help escaping generic AI-generated design patterns. Default to three directions unless the user's invocation requests another number.
---

# Explore design directions

Generate a small set of deliberately different design directions before any implementation begins. The purpose of this skill is divergence: escape the model's most probable visual answer, expose meaningful choices, and let human taste select or combine a direction before code hardens the design.

This skill produces direction briefs, not interfaces. Do not edit application
source. A coordinating workflow can pass those briefs to an implementation
skill when the user has already requested built prototypes.

## Respect the full invocation

Treat the user's entire invocation, including any text written after the skill or slash command, as task instructions.

- Default to **3 design directions**.
- If the user clearly requests another count in natural language, use that count. Examples: `give me 7 options`, `show 5 directions`, `just two ideas`.
- Prefer a number that is grammatically tied to options, directions, concepts, designs, or variants. Do not mistake unrelated numbers in the product brief, such as prices, metrics, years, or version numbers, for the requested count.
- If multiple count instructions conflict, use the most recent explicit instruction.
- Preserve all other invocation qualifiers, such as `editorial`, `no gradients`, `mobile-first`, `for enterprise buyers`, or `keep our current logo`.

Do not require special argument syntax when ordinary language is clear.

## Orient before exploring

Read the relevant brief, project documentation, root `DESIGN.md`, existing design tokens, brand constraints, assets, and current interface when they are available. Identify:

- the product or subject;
- the audience;
- the single most important job of the page or interface;
- the emotional tone the experience should create;
- durable brand or product constraints;
- content that must remain prominent;
- technical or platform constraints that materially affect the design; and
- explicit user likes, dislikes, references, and exclusions.

If the repository already has a strong design system, explore directions that can plausibly extend or reinterpret it rather than pretending the project is greenfield.

Do not ask questions merely to complete a design questionnaire. If the available context is sufficient, make reasonable assumptions and state only the ones that materially affect the directions.

## Inject external entropy

Do not ask the language model to invent its own random seed. Generate entropy outside the model before creating directions.

Prefer the bundled helper:

```sh
node scripts/generate-seeds.mjs <count>
```

Run it from this skill directory. Bun is also compatible:

```sh
bun scripts/generate-seeds.mjs <count>
```

Generate at least one independent seed per requested direction. The seed is a creative perturbation, not a design requirement and not something to show the user unless it helps explain the process.

If neither Node nor Bun is available, use another local source of entropy rather than model-generated randomness. Suitable examples include:

```sh
python -c "import secrets; print(secrets.token_hex(16))"
```

```sh
openssl rand -hex 16
```

or an equivalent standard-library random-byte generator available in the environment.

If no executable/runtime capable of external randomness is available, continue without pretending randomness occurred. Compensate by systematically varying the creative dimensions below.

## Translate entropy into design choices

Use each independent seed to perturb several design dimensions. Do not map characters mechanically to a fixed style table; interpret the entropy in the context of the product so the output remains meaningful.

For every direction, make intentional choices across most of these dimensions:

- **Composition:** grid, asymmetry, stacking, editorial flow, spatial canvas, dense utility layout, large fields of whitespace, overlap, framing.
- **Typography:** voice, contrast, scale, rhythm, serif/sans/mono roles, display versus utilitarian treatment.
- **Material or metaphor:** derive from the product's real world, workflows, artifacts, environments, tools, history, or culture rather than arbitrary style labels.
- **Color logic:** semantic roles, dominant field, accent strategy, contrast, restraint, monochrome or expressive use.
- **Imagery medium:** photography, illustration, generated art, diagrams, 3D, texture, data visualization, iconography, or deliberately no hero imagery.
- **Density and rhythm:** compact, spacious, alternating, continuous, modular, editorial.
- **Navigation and interaction:** conventional, contextual, spatial, progressive, command-like, story-led, or another justified model.
- **Motion language:** none, subtle continuity, kinetic type, physical movement, reveal, parallax, state transitions, or another purposeful system.
- **Convention to break:** choose at most one familiar convention to challenge when doing so strengthens the concept rather than merely making it unusual.

The directions must differ in underlying design logic, not only in color palettes or font choices.

## Force meaningful divergence

Before presenting the directions, compare them against each other.

Reject or revise any direction that is substantially the same composition with different styling. As a rule of thumb, at least three major dimensions should change between neighboring directions.

Avoid recurring AI defaults unless the project specifically justifies them:

- interchangeable rounded-card grids;
- purple-on-white or blue-purple gradients as generic futurism;
- gratuitous glassmorphism;
- huge generic headline plus floating product screenshot;
- decorative blobs, glows, grids, or particles without product meaning;
- arbitrary numbered sections;
- repeated pill-shaped labels;
- generic dashboard chrome used merely to signal "software"; and
- visual references that could fit an unrelated company after swapping the logo and copy.

Do not make every option weird. A restrained direction can be highly distinctive through typography, proportion, hierarchy, and craft.

## Present each direction as a decision

Give every direction a memorable working name. For each one, include:

1. **Core idea** — one or two sentences describing the concept and why it belongs to this product.
2. **Visual system** — composition, typography, color logic, imagery/material language, and density.
3. **Signature moment** — the one element or interaction a user is most likely to remember.
4. **Aesthetic risk** — one deliberate risk or convention being challenged, plus why it may be worth it.
5. **What to avoid** — the boundary that prevents this direction from collapsing into a cliché.
6. **Best fit** — what audience, brand posture, or product goal makes this direction strongest.

Keep the concepts concrete enough that a designer or implementation agent could act on them, but do not specify every CSS value or component.

## End at the taste checkpoint

When used on its own, present all requested directions and stop before
implementation to invite the user to exercise taste.

When used within `ap-design-studio` or another workflow where the user already
requested completed static concepts, return all requested briefs to that
workflow without requiring a favorite first. The coordinator builds the
prototypes and presents the rendered selection checkpoint. Still pause here
if the user requested ideas only or explicitly wants to choose before building.

Ask them to choose one direction, combine specific elements from several, or react in plain language. Useful reactions include:

- `I love 2, but use the typography from 1.`
- `3 feels too playful.`
- `Keep the asymmetry but make it calmer.`
- `None of these; push further.`

When the user reacts, treat those reactions as durable design constraints for the next exploration or implementation step.

Do not silently choose a winner for them unless they explicitly ask you to recommend one.
