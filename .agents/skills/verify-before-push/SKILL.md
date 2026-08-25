---
name: verify-before-push
description: Select and run minimally sufficient local evidence before push, before marking work Ready, before claiming checks passed, or after Base, Head, or worktree changes. Report Ready or Not Ready from the confirmed scope. Do not stage, commit, push, or read remote CI state.
---

# Verify before push

After the worktree's final change, use evidence matched to the diff to decide whether the current Head is ready to leave the workstation. A green Gate proves only the behavior it covers and never proves remote CI state.

## Sources of truth

- [Change scope and evidence selection](../../../docs/conventions/change-scope-and-evidence.md)
- [Quality gates and evidence](../../../docs/conventions/quality-gates-and-evidence.md)
- [Change evidence matrix](../../../ai/change-evidence-matrix.md)
- [Root Agent guide](../../../AGENTS.md)

## Boundary

Read Git state, generate scope, select and run local evidence, and report results only. Do not modify source, the index, commits, remote refs, PRs, or CI. If a Gate automatically changes a file, stop and treat the change as new input.

## Workflow

1. Confirm repository, branch, worktree, full Head, and the Base supplied by the user or a live branch relationship. Scripts must not guess Base.

```bash
git status --short --branch
git rev-parse --show-toplevel HEAD
pnpm change-scope --base <confirmed-base>
pnpm evidence:select --base <confirmed-base>
```

2. Read risk signals and add dynamic registration, build entrypoints, environment variables, migrations, browser behavior, and external Provider surfaces that the selector cannot infer.
3. Select at least one focused check that turns red for each target regression. Escalate through control-plane, data-plane, protocol, database, Web, E2E, artifact, documentation, or hygiene Gates according to `ai/change-evidence-matrix.md`.
4. Run `pnpm check:all` only when the change crosses inseparable evidence planes, changes root tooling or Gate infrastructure, performs a release rehearsal, diagnoses CI divergence, or the user explicitly requests it.
5. Run selected Gates sequentially. Regenerate scope after any worktree or Head change, PR retarget, Base merge, rebase, or conflict resolution, then rerun only affected evidence.
6. Inspect final state and diff, then report `Ready` or `Not Ready`.

## Evidence rules

- Do not repeat a narrower Gate already covered by a wider Gate on unchanged input.
- Do not manually duplicate the pre-push hook's `check:quick` merely because a push may follow.
- Never manufacture green evidence through `passWithNoTests`, lower thresholds, global ignores, empty tests, or irrelevant coverage.
- A required Gate failure produces `Not Ready`; record the exact command, failure, and environment rather than assuming CI will differ.
- Separate environment blockers from product failures. An unrun Gate did not pass.

## Completion report

List confirmed Base, final Head, worktree state, risk surfaces, each actual command and result, potentially relevant evidence not run and why, environment blockers, and remaining risk. Report `Ready` only when all required evidence passed and the input did not change afterward.
