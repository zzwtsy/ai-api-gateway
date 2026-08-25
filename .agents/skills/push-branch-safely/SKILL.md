---
name: push-branch-safely
description: Push an ai-api-gateway branch when the user explicitly authorizes the target remote and branch, including exact force-with-lease updates, then verify remote Head and PR CI state. This workflow owns the branch-push transaction only; it does not select local Gates, modify versions, or create tags or releases.
---

# Push a branch safely

Push one explicit local Head to one explicit remote branch, then verify the remote ref, PR mergeability, and CI. Ordinary implementation, verification, or commit requests do not authorize a push.

## Sources of truth

- [Git commit convention](../../../docs/conventions/git-commits.md)
- [Change scope and evidence selection](../../../docs/conventions/change-scope-and-evidence.md)
- [Quality gates and evidence](../../../docs/conventions/quality-gates-and-evidence.md)

## Preconditions

1. Confirm explicit user authorization for this push, target remote, and target branch.
2. Read the branch, worktree, full local Head, and upstream.
3. Confirm that required local evidence was completed on the final input. If it is missing or failed, stop rather than expanding this workflow into test repair.
4. Inspect the outbound commit range so unrelated local commits do not enter the target branch.

## Ordinary push

Use an explicit refspec and allow the repository pre-push hook to run:

```bash
git push origin HEAD:refs/heads/<branch>
```

Stop when the hook fails. Never use `--no-verify` unless the user authorizes that exact bypass after seeing the failure.

## History rewrite

Never use bare `--force`. Only after the user explicitly authorizes rewriting the target branch:

```bash
git fetch origin refs/heads/<branch>:refs/remotes/origin/<branch>
git rev-parse refs/remotes/origin/<branch>
git push --force-with-lease=refs/heads/<branch>:<observed-oid> origin HEAD:refs/heads/<branch>
```

If the lease does not match, stop and re-read the remote change. Do not broaden the lease, overwrite new commits, or retry automatically. After a rewrite, old commits, approvals, and inline-comment anchors are not evidence for the new Head.

## Remote verification

Fetch the target branch after pushing and confirm that its OID matches the expected local Head:

```bash
git fetch origin refs/heads/<branch>:refs/remotes/origin/<branch>
test "$(git rev-parse HEAD)" = "$(git rev-parse refs/remotes/origin/<branch>)"
```

When a PR exists, read live checks and mergeability:

```bash
gh pr checks
gh pr view --json headRefOid,mergeable,mergeStateStatus,statusCheckRollup
```

Report Pending as Pending. Read concrete logs before attributing a failure. When no workflow run exists, inspect mergeability first; do not manufacture a run with empty commits, Draft/Ready toggles, revert-and-restore, or repeated pushes.

## Completion report

List the authorized remote and branch, push type, full local and remote OIDs before and after, hook result, PR mergeability, CI state as Passed/Failed/Pending, unverified items, and remaining risk. A successful push is not successful CI.

This workflow incorporates exact lease, remote Head, and CI verification rules from DeepSeek Harness `dsh-pre-push-checks`. See [Third-Party Notices](../THIRD_PARTY_NOTICES.md) for licensing.
