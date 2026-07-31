---
name: ap-start-dev-session
description: Orient to a repository at the beginning of a development session, establish an isolated Git worktree for mutable local work, understand the product and technical context, inspect current progress, and then begin the requested task. Use when the user says start a development session, begin work, orient yourself, read the project context, or provides a task that should start from the repository's PRD, technical requirements, and TODO state.
---

# Start a Development Session

Treat any text supplied with the invocation as additional task details,
constraints, paths, or priorities. Do not ignore it.

## Orient before acting

1. Locate the repository root and read its applicable agent instruction files.
2. First check these requested project-context paths:
   - `.agentspack/PRD.md`
   - `.agentspack/TECHNICAL_REQUIREMENTS.md`
   - `.agentspack/todos.md`
3. Read each one that exists. When one is absent, search for the repository's
   canonical equivalent, including casing variants and established root or
   documentation locations. Do not create a missing file or stop merely because
   the preferred path is absent.
4. Read only the additional architecture, design, plan, or package
   documentation needed to understand the supplied task.
5. Inspect the current branch, working-tree status, repository worktrees, and
   relevant uncommitted changes. Review the active plan and recent task state
   before assuming what remains to do.

Do not rely on a filename match alone. Confirm that the document is current and
actually applies to this repository or package.

## Isolate mutable local work

For a task that is expected to modify a Git repository, default to a dedicated
linked worktree and a new branch before changing files. Creating only a new
branch in the current working tree does not isolate parallel sessions from its
checkout or uncommitted files.

1. Inspect the current repository with `git status --short --branch`,
   `git worktree list --porcelain`, and the applicable repository instructions.
2. Reuse the current directory only when it is already a dedicated worktree for
   this task or the user explicitly asks to work in the current checkout. Do not
   create a nested worktree for an already-isolated session.
3. For a new independent task, use the base ref named by the user or current
   project plan. Otherwise prefer the repository's primary branch rather than
   silently stacking work on an unrelated feature branch. If the task is meant
   to continue an existing branch or uncommitted change, preserve that state and
   ask only when the intended base is materially ambiguous.
4. Choose a unique, descriptive branch name and an adjacent worktree path
   outside the existing working tree, following repository conventions. Verify
   that neither is already in use, then create both with
   `git worktree add -b <branch> <path> <base-ref>`.
5. Continue every subsequent read, edit, command, and verification from the new
   worktree. State its path and branch so the user can find the session's work.

Never stash, reset, clean, switch, or move existing changes merely to create
the worktree. Do not remove another session's worktree or reuse its branch. If
permissions prevent creating the isolated worktree, request the needed access
or report the blocker instead of silently falling back to a shared checkout.

Do not create a worktree for read-only orientation, a session with no supplied
task, or a non-Git directory. If such a session later begins mutable Git work,
create the isolated worktree before the first change.

## Form the working context

Determine:

- the product goal and user problem;
- the task requested for this session;
- technical and architectural constraints;
- established repository conventions and verification commands;
- completed, active, blocked, and next work;
- relevant uncommitted changes; and
- the worktree path, branch, and base ref for mutable Git work; and
- ambiguities that would materially change the task.

Keep the orientation concise. Do not recite entire documents back to the user.
Call out conflicts between documentation and repository state rather than
silently choosing one.

## Begin the session

Briefly state:

- what you understand the immediate goal to be;
- the most relevant existing state and constraints; and
- any blocking uncertainty.

Then proceed with the supplied task. If no task was supplied, finish the
orientation and ask what the user wants to work on. Do not change code merely
to demonstrate that the session has started.
