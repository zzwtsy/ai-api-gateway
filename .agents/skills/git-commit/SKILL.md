---
name: git-commit
description: Prepare, split, review, or create local Git commits for ai-api-gateway when the user explicitly asks for commit work. Preserve mixed staging and partial hunks; this skill never implies amend, tag, push, rebase, reset, stash, or release authorization.
---

# Git Commit

Create reviewable local history without taking ownership of unrelated working-tree or index state.

## Sources of truth

- [Git commit convention](../../../docs/conventions/git-commits.md)
- [Change scope and evidence](../../../docs/conventions/change-scope-and-evidence.md)
- [Quality gates and evidence](../../../docs/conventions/quality-gates-and-evidence.md)

Commit authorization is narrow. Do not amend, tag, push, rebase, reset, stash, release, or bypass hooks unless the user separately authorizes that exact action.

## Workflow

1. Inspect branch, `HEAD`, staged, unstaged, untracked, and partially staged state before changing the index.
2. Define one logical commit scope from the user's request and inspect the exact patch to be committed.
3. Use explicit paths. Never run `git add .`, `git add -A`, or a broad equivalent in a dirty worktree.
4. If the index already contains unrelated changes, use `git commit --only -- <paths>` for whole-file commits and review `git diff HEAD -- <paths>` immediately before committing.
5. If a selected file contains unrelated hunks that must not ship together, stop and ask the user to split or choose the hunks. Do not automate interactive staging, reset, or stash.
6. Write the message to a temporary file with real newlines and use `git commit -F <file>`. Follow Commitlint and explain why when a body is useful.
7. Let hooks run. Never default to `--no-verify`.
8. After the commit, inspect the committed patch, final subject, remaining index, working tree, and recent log. If a hook changed a file, confirm whether that change entered the commit and report it precisely.

Read [mixed worktree scenarios](references/mixed-worktree.md) before operating on an existing index, untracked files, or partial staging.
