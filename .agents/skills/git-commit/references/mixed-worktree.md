# Mixed worktree scenarios

Read the current index and worktree before selecting a path:

```bash
git status --short
git diff --cached --stat
git diff --stat
git ls-files --others --exclude-standard
```

Use these rules:

| State | Safe action |
| --- | --- |
| Clean index, whole tracked file belongs to the commit | `git add -- <path>` then commit normally |
| Clean index, untracked file belongs to the commit | Inspect it, then `git add -- <path>` |
| Unrelated paths already staged, selected whole files belong in full | Review `git diff HEAD -- <paths>` and use `git commit --only -- <paths>` |
| Selected file is partially staged but all current content belongs together | Treat it as mixed state; explain that `--only` commits the full working-tree version for that path before proceeding |
| Selected file contains unrelated hunks | Stop for user-directed splitting; do not reset, stash, or script interactive staging |
| Hook rewrites a file | Inspect `git show --stat --oneline HEAD`, `git show --format=fuller HEAD`, and remaining status before claiming success |

Prefer a subject that states the delivered outcome. Use an optional body for motivation, constraints, or verification—not a file inventory or implementation transcript.
