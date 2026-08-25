---
name: postmortem
description: Produce an evidence-backed postmortem and a permanent guard when a defect escapes into a real entrypoint, release artifact, or user environment. Do not use for ordinary pre-release bugs or speculative risk reviews.
---

# Postmortem

Use `docs/postmortems/_template.md`. Record only facts confirmed by reproduction, logs, tests, or commits.

Complete all of the following:

1. State the actual impact and relevant impacts that did not occur.
2. Identify the broken runtime relationship and the path that actually executed.
3. Explain why existing typechecks, unit tests, fixtures, artifact checks, or CI did not catch it.
4. Add a regression scenario at the closest real entrypoint without requiring Secrets.
5. Convert the root cause into an owning local AGENTS rule, Convention, Decision, or runtime invariant.
6. Reintroduce the smallest defect to prove the new test or Gate turns red, restore the fix, and record the commands.
7. Run the evidence selected by `pnpm evidence:select --base <confirmed-base>`.

Do not preserve a reasoning transcript, use “add more tests” as an ownerless action without a defined failure surface, or blame an individual as the root cause.
