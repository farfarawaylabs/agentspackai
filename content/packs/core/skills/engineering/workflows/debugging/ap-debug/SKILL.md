---
name: ap-debug
description: Investigate, diagnose, and, when requested, fix a reproducible software problem by tracing evidence to its root cause. Use for bugs, regressions, crashes, incorrect output, flaky tests, unexpected state, failed integrations, performance regressions, or requests to explain why code behaves incorrectly. Do not use for a broad security audit or routine error-handling design.
---

# Debug

Do not guess from the first symptom. Build an evidence chain from the observed
failure to the responsible code, configuration, data, dependency, or
environment, then verify the conclusion against competing explanations.

## Respect the requested scope

- **Diagnosis is read-only by default.** If the user asks only to investigate,
  explain, or find the root cause, do not edit the repository.
- **Fix when requested.** Make the smallest coherent root-cause correction and
  verify it.
- Do not turn a focused bug into an unrelated cleanup, refactor, dependency
  upgrade, or architectural rewrite.

## Define and reproduce the failure

1. Restate the expected behavior, actual behavior, affected environment, and
   observable success condition.
2. Read the relevant repository instructions, tests, code, configuration,
   dependency versions, recent changes, logs, and runtime setup.
3. Find the shortest reliable reproduction. Record its exact inputs, commands,
   state, and output before changing anything.
4. Reduce the reproduction when possible without removing the failure.
5. If the issue cannot be reproduced, distinguish missing access or setup from
   genuinely intermittent behavior. Collect additional evidence rather than
   inventing a cause.

Preserve useful failure output, but redact credentials, secrets, personal data,
tokens, and sensitive payloads.

## Trace the real execution path

Follow data and control flow across every relevant boundary:

- caller, entry point, and triggering state;
- parsing, validation, normalization, and authorization;
- application and domain logic;
- persistence, caches, queues, and concurrency;
- external services, SDKs, and protocol boundaries;
- framework lifecycle, configuration, build, and deployment behavior; and
- translation into the final error, output, or visible symptom.

Read the actual implementation instead of reasoning from filenames or assumed
architecture. For external APIs, runtimes, frameworks, or libraries, verify
current official documentation against the exact version and configuration the
repository uses.

## Test competing hypotheses

1. List plausible explanations that fit the evidence, including at least one
   alternative to the leading hypothesis.
2. For each serious candidate, state what evidence would confirm or contradict
   it.
3. Run the smallest discriminating check: inspect state, add temporary
   instrumentation, execute a focused test, compare a known-good path, or build
   a minimal harness.
4. Update the hypotheses from the result. Do not keep a favored explanation
   after evidence conflicts with it.
5. Identify the earliest incorrect state or violated invariant, not merely the
   final place that reports the failure.

Change one meaningful variable at a time. Do not apply several speculative
fixes and treat a passing result as proof of which one mattered.

After three unsuccessful fix attempts, stop patching. Reassess the reproduction,
assumptions, system boundaries, and whether multiple defects or an architectural
problem better explain the evidence.

## Fix the root cause

When implementation is authorized:

1. State the supported root cause and why the evidence rules out the leading
   alternatives.
2. Choose the smallest fix that restores the intended invariant at the layer
   that owns it.
3. Preserve public contracts and repository conventions unless changing them
   is part of the requested solution.
4. Add or update a regression test that failed for the original reason and
   passes after the fix.
5. Remove temporary diagnostics unless they provide durable, safe
   observability.

Do not hide the problem with a broad catch, silent fallback, arbitrary delay,
unbounded retry, weakened validation, skipped test, or hard-coded special case.

## Verify and explain

Run the original reproduction, focused regression tests, relevant adjacent
tests, and the repository's appropriate build, type, lint, or static checks.
Check that the fix did not introduce a new failure in neighboring states.

Report:

- the symptom and user impact;
- the root cause in plain language;
- the evidence and alternatives tested;
- the fix, when one was requested;
- the exact verification performed;
- remaining uncertainty or untested environments; and
- any separate follow-up that is useful but outside the requested fix.

Use a short concrete example or familiar analogy when it makes the cause easier
to understand. Do not claim a root cause or successful fix without reproducible
evidence.
