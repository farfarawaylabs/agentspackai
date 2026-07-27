---
name: ap-start-dev-session
description: Orient to a repository at the beginning of a development session, understand the product and technical context, inspect current progress, and then begin the requested work. Use when the user says start a development session, begin work, orient yourself, read the project context, or provides a task that should start from the repository's PRD, technical requirements, and TODO state.
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
5. Inspect the current branch and working-tree status. Review relevant
   uncommitted changes, the active plan, and recent task state before assuming
   what remains to do.

Do not rely on a filename match alone. Confirm that the document is current and
actually applies to this repository or package.

## Form the working context

Determine:

- the product goal and user problem;
- the task requested for this session;
- technical and architectural constraints;
- established repository conventions and verification commands;
- completed, active, blocked, and next work;
- relevant uncommitted changes; and
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
