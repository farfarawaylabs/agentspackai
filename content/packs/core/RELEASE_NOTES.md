# Agents Pack Core 0.31.0

- Add the optional `ap-design-studio` skill to guide the complete design process
  by invoking the individual exploration, implementation, critique, and polish workflows.
- Add `ap-explore-design-directions` to develop distinct visual concepts before building.
- Add `ap-implement-new-design` to implement a chosen direction and iterate using fresh,
  independent critiques, with bounded rounds and explicit acceptance criteria.
- Add `ap-design-polish` for focused visual cleanup and refinement, including audit-only use.
- Add the read-only `ap-design-critic` subagent for evidence-based visual critique.
  Each critique starts fresh without inherited discussion or previous critique conclusions.
- Default Design Studio concepts to fully static, shareable HTML pages. Implementing a
  selected concept in the real application requires the user's explicit request.
- Update frontend design and review to respect static prototype boundaries,
  including local assets, offline checks, and concept-local design notes.
- Keep each skill independently usable and accept user details such as concept count.

Upgrade to CLI 0.3.0 to choose the new design components during `agents-pack update`,
or install them explicitly after updating the pack.
