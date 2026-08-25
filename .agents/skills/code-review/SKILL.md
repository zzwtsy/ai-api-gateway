---
name: code-review
description: Perform a read-only semantic review of an ai-api-gateway PR, branch, or worktree diff against live Base/Head state, project invariants, real consumers, and minimally sufficient evidence. Check correctness, lifecycle, security, protocol, release entrypoints, and documentation synchronization. Do not fix, commit, or push changes.
---

# Code review

Review only the specified diff. This workflow complements rather than duplicates [`ai/review-checklist.md`](../../../ai/review-checklist.md), and a green automated Gate is not proof of semantic correctness. Prioritize defects that break behavior, lifecycle, security, protocol, or a real delivery entrypoint; one evidenced blocker is more valuable than a list of style preferences.

Always report without modifying code, documentation, tests, Git state, or remote state. Treat a later request to fix findings as a new implementation task.

## Sources of truth

- [Root Agent guide](../../../AGENTS.md)
- [Code Review Checklist](../../../ai/review-checklist.md)
- [Change evidence matrix](../../../ai/change-evidence-matrix.md)
- [Change scope and evidence selection](../../../docs/conventions/change-scope-and-evidence.md)
- [Quality gates and evidence](../../../docs/conventions/quality-gates-and-evidence.md)
- [Defensive engineering patterns](../../../docs/conventions/defensive-patterns.md)

Also read the nearest `AGENTS.md`, the owning implementation, recent tests, relevant Feature or Convention documents, and current Decision Notes for the affected paths. Do not scan the entire repository indiscriminately.

## Establish the live review range

1. Confirm Base from the current PR, branch relationship, or user request. Scripts must not guess it.
2. Confirm the exact Head. For a remote PR, fetch its live Head before reviewing; do not reuse conclusions from an older commit.
3. Inspect the worktree and generate scope reports:

```bash
git status --short --branch
git rev-parse --show-toplevel HEAD
pnpm change-scope --base <confirmed-base> --head <confirmed-head>
pnpm evidence:select --base <confirmed-base>
```

4. A PR retarget, Base merge, rebase, or new push invalidates the old range. Reconfirm Base and Head, then revisit only the review and evidence affected by the new range.
5. Scope reports discover paths and risks; they do not replace reading the diff, owning code, and real consumers.

## Build the behavioral contract

For each behavior change, identify:

- callers, producers, consumers, and lifecycle owners;
- input, output, error, cancellation, timing, and persistence semantics;
- compatibility surfaces such as fields, bytes, headers, IDs, and states;
- the real entrypoint that delivers the behavior;
- the test or external observation that would fail on the target regression.

Change descriptions, Decision Notes, and tests are evidence, not absolute truth. Cross-check them against current source, runtime paths, and externally observable results.

## Review workflow

1. Read the diff file by file and follow each change into the owning implementation, both sides of affected interfaces, real consumers, and recent tests.
2. Apply the [Code Review Checklist](../../../ai/review-checklist.md) across scope, architecture, lifecycle, protocol, security, generation, UI, artifacts, evidence, and documentation synchronization.
3. Construct a reproduction condition or counterexample for every candidate finding. Confirm that it applies to the current Head rather than an older version, speculation, or preference.
4. Determine whether tests would turn red for the target regression. Distinguish source inference, local runtime results, browser evidence, and remote CI.
5. Report only issues with a precise location, consequence, evidence, and smallest owning-layer correction. Mark insufficiently proven concerns as verification gaps.
6. If there are no findings, still state the reviewed range, unverified surfaces, and remaining risk. “No finding” is not proof of correctness.

## Finding format

```text
[blocker | high | medium | suggestion] Short title
Location: narrowest relevant file and line
Defect: what the current code actually does
Impact: contract, user path, or invariant that breaks
Evidence: call path, counterexample, current rule, or reproduction condition
Suggested correction: smallest owning-layer direction
```

Separate blockers from suggestions. Do not present formatting preferences as correctness defects, repeat a condition already fully enforced by a Gate, or state an unproven suspicion as fact. Finish with confirmed Base and Head, files and consumers inspected, actual commands, unverified items, and remaining risk.

This workflow is adapted from DeepSeek Harness `dsh-code-review` for this repository. See [Third-Party Notices](../THIRD_PARTY_NOTICES.md) for licensing.
