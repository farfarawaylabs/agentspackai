---
title: "ap-dev-flow-auto's invocation authorizes push and a draft PR, nothing more"
kind: "decision"
status: "active"
visibility: "shared"
applies_to:
  - "content/packs/core/skills/engineering/dev-flow/ap-dev-flow-auto"
tags:
  - "dev-flow"
  - "authority"
created_at: "2026-09-22"
updated_at: "2026-09-22"
created_by: "claude"
verified_at: "2026-09-22"
supersedes: []
superseded_by: null
---

Naming `ap-dev-flow-auto` is itself the authorization to push the branch that
run created to the default remote and to open one **draft** pull request. That
is the entire grant: no merge, publish, deploy, force-push, remote history
rewrite, primary/protected branch push, or non-default remote.

Chosen over asking for ship permission once before the run, because a skill
whose whole purpose is unattended execution cannot also require a human touch.
The draft state, the up-front announcement of remote and branch, and "a stopped
run opens no pull request" are what make the grant safe.

Do not weaken `ap-dev-implement`'s own authority rules to match; implementers
still may not push or open pull requests.

## Evidence

- `skills/engineering/dev-flow/ap-dev-flow-auto/SKILL.md`, "Authority".
- Spec sections 6 and 15 in `docs/ap-dev-flow-spec.md` (untracked, outside the repo).
