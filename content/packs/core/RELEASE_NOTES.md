# Agents Pack Core 0.27.0

- Add portable, repository-owned project memory shared by Claude Code, Codex,
  and Cursor.
- Add required `ap-recall-memory` and `ap-save-memory` skills that use ordinary
  Markdown and filesystem tools instead of a memory CLI or provider-private
  storage.
- Add the required, explicitly invoked `ap-maintain-memory` skill for
  conservative deduplication, consolidation, supersession, repair, and shared
  index maintenance, including detection of local memories that are already
  tracked by Git.
- Recall relevant project memory and save verified durable learning
  automatically through concise Core instructions.
- Default memories to Git-reviewable shared knowledge while keeping clearly
  user-, machine-, and checkout-specific memory in an ignored local directory.
- Preserve memory as user-owned repository data across Core updates, rollback,
  and ejection.
