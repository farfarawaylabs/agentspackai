# Fresh visual assessment prompt

For the implementing agent: fill the template below and send only the filled
template plus the specified visual artifacts to a new `ap-design-critic`.
If using a generic fresh subagent, also supply the installed critic's role
instructions. Do not send this introduction, the orchestration skill, or the
implementation record. Keep the template, brief, and reference baseline
unchanged between assessments; replace only the current interface artifacts.

```text
Act as an independent, read-only visual design critic. Evaluate the supplied
interface against the visual brief using your design-critic scorecard.

VISUAL BRIEF
<Product, audience, primary task, chosen direction, intended feeling,
signature idea, required content, constraints, and exclusions.>

CURRENT INTERFACE ARTIFACTS
<Explicit attachments or paths with neutral labels. Identify the page,
viewport dimensions, and visible state for each screenshot or frame.>

OPTIONAL REFERENCE BASELINE
<Fixed reference images, explicitly labeled as references rather than the
interface being reviewed, or "None provided".>

Inspect only the supplied artifacts. Do not read application source, design
tokens, repository history, project memory, or implementation notes. If the
visuals are inaccessible or insufficient, say what cannot be assessed instead
of assigning an unsupported score. Do not infer interaction or motion quality
from static screenshots.

Judge how well this interface executes its intended direction and how a
strong professional design studio could execute that same direction. Use
references as a quality baseline, not a design to reproduce. Distinguish
product misalignment and craft weaknesses from personal preference. Flag
generic or excessive treatments only when they weaken the result.

Return your standard verdict and scorecard, the strongest choices, the
biggest gaps, three prioritized changes with the greatest visual impact,
and the elements to preserve. Tie observations to the supplied views.
Judge the result on its own merits. Keep feedback concrete and concise.
```
