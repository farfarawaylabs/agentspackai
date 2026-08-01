# Feature and subsystem documentation

Use this reference only when the repository has no clear documentation
structure or when creating or substantially revising a durable feature or
subsystem document. Existing repository conventions take precedence.

## Use a small fallback structure

```text
docs/
├── README.md        # Documentation map and canonical sources
├── features/        # Features and user-visible product behavior
├── architecture/    # Subsystems and cross-cutting architecture
└── operations/      # Deployment, recovery, monitoring, and runbooks
```

`docs/README.md` should tell a developer or agent which documents are
authoritative for the main product areas. Keep it a map, not another copy of
their content.

Use `docs/internal/` only when the repository already uses it or needs an
explicit boundary between public documentation and developer-only material.
Do not introduce both hierarchies for the same audience.

## Keep decisions with their subject

Record a decision in the feature or subsystem document whose behavior it
governs. Record a cross-cutting decision in the architecture document that owns
the shared concern. Link to that canonical explanation from affected documents
instead of copying it.

A separate ADR or decision-log convention is valid when the repository already
uses one. Do not introduce it by default: scattering rationale across separate
records makes a future developer or agent reconstruct the subsystem from
multiple files.

## Decide whether to create a document

Create or substantially extend a document when the subject has durable value,
including:

- a new feature or supported workflow;
- a subsystem with meaningful boundaries, invariants, or extension points;
- a contract, data model, migration strategy, or integration;
- operational, recovery, security, or privacy behavior; or
- a decision whose rationale and tradeoffs will constrain future work.

Prefer updating an existing canonical document. Do not create a new document
for a small refactor, obvious implementation detail, one-off fix, or module that
is already understandable from its code and tests.

## Suggested document shape

Adapt these sections to the subject rather than creating empty ceremony:

```markdown
# Feature or subsystem

## Purpose and user outcome

## Current behavior and scope

## Architecture and data flow

## Key decisions and why

### Decision: Descriptive title
- Choice:
- Why:
- Alternatives considered:
- Tradeoffs and consequences:
- When to reconsider:

## Invariants and non-obvious constraints

## Failure and security considerations

## How to use, test, and extend

## Relevant code and tests
```

Describe the current system, not the chronological story of how it was built.
Keep low-level logic in code and tests. Use documentation for boundaries,
behavior, rationale, constraints, and navigation that remain useful across
implementation changes.
