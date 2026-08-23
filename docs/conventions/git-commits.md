---
document_id: AIGW-GIT-001
status: normative
last_reviewed_at: 2026-08-23
language: zh-CN
---

# Git Commit 约定

## Commit Message

本仓库使用 Conventional Commit 结构：

```text
type(optional-scope): summary
```

允许的 `type` 为 `feat`、`fix`、`refactor`、`perf`、`test`、`docs`、`build`、`ci`、`chore`、`revert`、`style`。Scope 可省略且不维护固定枚举；摘要可以使用中文或英文，但不能为空，完整 Header 最长 100 个字符。

Commitlint 是消息结构的机器事实，Lefthook 在 `commit-msg` 阶段执行 `pnpm exec commitlint --edit {1}`。不得把 `--no-verify` 作为默认路径。

## 工作树与 Index

创建 Commit 前必须分别检查 staged、unstaged、untracked 和部分暂存状态。始终使用显式路径，不运行 `git add .`、`git add -A` 或等价的整仓库暂存。

当 Index 已有无关改动，而目标是提交若干整文件时，提交前使用 `git diff HEAD -- <paths>` 审查实际内容，并使用 `git commit --only -- <paths>`，使既有 Index 保持原状。同一文件含有不应一起提交的不同 Hunk 时停止并请求用户拆分；不得自动 Reset、Stash、覆盖 Index 或脚本化交互暂存。

多段 Commit Message 写入临时消息文件并通过 `git commit -F` 提交，保证真实换行。Hook 运行后必须复查最终 Commit、提交 Patch 与剩余 Index；Hook 修改文件时明确报告修改进入了 Commit 还是仍留在工作树。

## 授权边界

用户要求“Commit”只授权创建本地 Commit，不包含 Amend、Tag、Push、Rebase、Release、Reset 或 Stash。上述动作必须分别获得明确授权。`$git-commit` 实现这套流程，但 Convention 是长期事实来源。
