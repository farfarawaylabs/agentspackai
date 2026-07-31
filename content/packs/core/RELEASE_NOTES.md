# Agents Pack Core 0.26.1

- Make `ap-start-dev-session` use a dedicated Git worktree and new branch by
  default before mutable local work.
- Reuse an existing task worktree when appropriate and preserve unrelated
  branches, worktrees, and uncommitted changes.
