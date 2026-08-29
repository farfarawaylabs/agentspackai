# Agents Pack Core 0.30.0

- Add the optional `ap-subagent-driven-development` skill, configured and
  instructed for explicit invocation, for executing a prepared plan through
  fresh task implementers, task-scoped independent reviews, reviewed repair
  loops, and a final whole-branch review.
- Authorize local per-task commits inside the dedicated feature worktree while
  keeping push, merge, publish, deployment, and unrelated changes outside the
  workflow's authority.
- Preserve the upstream five-round repair circuit breaker and durable progress
  ledger, while adapting model selection and subagent dispatch to portable
  provider capabilities.
- Bundle deterministic plan workspace, task extraction, and review-package
  helpers with collision-safe run identities and correct Markdown task
  boundaries.
- Adapt the workflow from the MIT-licensed Superpowers v6.3.0 skill at a pinned
  upstream commit.
