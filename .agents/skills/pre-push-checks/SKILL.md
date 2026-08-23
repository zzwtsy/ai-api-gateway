---
name: pre-push-checks
description: 在推送、强制更新分支、标记 Ready、宣称检查通过，或 PR Retarget/Base Merge/Rebase 后使用；基于已确认 Base 选择最小充分证据，并验证远端 Head 与 CI 状态。
---

# 推送前检查

目标是在工作树最后一次变化后运行一次与 Diff 匹配的最小充分证据，并准确报告远端状态。Git Hook 和 CI 各有职责：本地不机械重跑完整矩阵，也不能把“Push 成功”误报成“CI 通过”。

## 事实来源

- [变更范围与证据选择](../../../docs/conventions/change-scope-and-evidence.md)
- [质量门禁与验证证据](../../../docs/conventions/quality-gates-and-evidence.md)
- [变更证据矩阵](../../../ai/change-evidence-matrix.md)
- [根 Agent 工作指南](../../../AGENTS.md)

## 建立出站范围

1. 确认仓库、分支和工作树：

```bash
git status --short --branch
git rev-parse --show-toplevel HEAD
```

2. 从实时 PR、分支关系或用户要求确认 Base；脚本不会 Fetch 或猜测。
3. 生成范围和证据建议：

```bash
pnpm change-scope --base <confirmed-base>
pnpm evidence:select --base <confirmed-base>
```

4. 阅读风险信号，补充选择器无法理解的动态注册、构建入口、环境变量和外部 Provider 表面。
5. PR Retarget、Base Merge、Rebase 或新提交会使旧报告失效。重新生成范围，并只重跑被新范围或冲突解决影响的证据。

## 选择最小充分证据

每个行为变化至少有一个会为目标回归变红的聚焦证据。常见升级：

| 表面 | 至少考虑 |
| --- | --- |
| 控制面 Route、公开 Schema、生成客户端 | `pnpm check:control` |
| 数据面装配、Routing、Observation、Recording | `pnpm check:data` |
| 协议、Header、Streaming、Abort、Backpressure | `pnpm check:protocol` |
| Drizzle Schema、Migration、耐久格式 | `pnpm check:db` |
| Web Component、页面、文案、构建 | `pnpm check:web` |
| 浏览器 Golden Journey | `pnpm check:e2e` |
| plain Node、Vite Dist、Docker、发布入口 | `pnpm check:artifact` |
| 文档、AGENTS、Skill、Decision | `pnpm check:docs` |
| 阶段收口或发布前删熵 | `pnpm hygiene` |

以下情况才升级到 `pnpm check:all`：

- 修改跨越多个证明平面，无法可信地拆成更窄 Gate；
- 修改根工具链、Gate Runner、CI、边界策略或未知路径；
- 发布演练；
- 诊断 CI 与本地不一致；
- 用户明确要求完整演练。

不要用 `passWithNoTests`、降低阈值、全局 Ignore 或空测试制造绿色结果。若聚焦测试无法覆盖目标文件，增加真实 owning tests 或重新判断范围；不要为了覆盖率执行与行为无关的行。

## 避免无意义重复

- 工作树未变化且同一 Gate 刚刚通过时，不因“接下来要 Commit/Push”再次手动运行；
- Pre-push Hook 仍会执行仓库定义的 `check:quick`，不要仅为复制 Hook 再运行一次；
- 更宽 Gate 已包含更窄 Gate 且输入未变化时，保留一次结果即可；
- Commit Hook 自动修复文件后，必须检查 Diff，并把修复视为新的输入重新判断受影响证据。

## 失败处理

必需 Gate 失败时停止普通 Push。记录精确命令、失败测试和环境，不要假设 CI 会不同。

环境差异只有在有证据时才成立：

- 记录平台、Runtime、命令和实际差异；
- 确认非平台相关的证据；
- 必需 Gate 的跨平台非确定性优先修复；
- 只有用户明确同意时才绕过 Hook，并准确报告失败和预期 CI 差异。

## 历史重写安全

禁止裸 `--force`。独立分支 Rebase 前先 Fetch 并记录远端精确 OID：

```bash
branch="$(git branch --show-current)"
git fetch origin "refs/heads/$branch:refs/remotes/origin/$branch"
observed_oid="$(git rev-parse "refs/remotes/origin/$branch")"
git push \
  --force-with-lease="refs/heads/$branch:$observed_oid" \
  origin "HEAD:refs/heads/$branch"
```

Lease 不匹配时停止并重新读取远端变化，不扩大 Lease。重写后旧 Commit、旧批准和旧 Inline Comment 锚点都不是当前证据；重新检查 Head、Review Thread、Mergeability 和 CI。

## 普通 Push 与远端核对

1. 运行选定证据；
2. 使用显式路径暂存并检查 Pre-commit 自动修复；
3. 正常 Push，让 Pre-push Hook 执行；
4. Fetch 当前分支并确认远端 Ref 与本地 `HEAD` 一致：

```bash
branch="$(git branch --show-current)"
git fetch origin "refs/heads/$branch:refs/remotes/origin/$branch"
test "$(git rev-parse HEAD)" = "$(git rev-parse "refs/remotes/origin/$branch")"
```

5. 存在 GitHub PR 时读取实时检查：

```bash
gh pr checks
```

Pending 必须报告为 Pending。失败必须先读取具体日志，不能仅凭名称归因。

当 `gh pr checks` 显示没有检查且目标 Head 没有 Workflow Run 时，先检查 Mergeability：

```bash
gh pr view --json mergeable,mergeStateStatus
```

若 PR 冲突，解决冲突才是修复。不要用空 Commit、Draft/Ready 切换、Revert-and-restore 或重复 Push 制造无意义历史。

## 完成报告

必须列出：

- 确认的 Base、最终本地 Head 和远端 Head；
- `change-scope` 风险表面；
- 实际运行的每条命令和结果；
- 未运行但可能相关的证据及原因；
- CI 的 Passed、Failed 或 Pending 状态；
- 剩余风险和任何授权绕过。

不能只写“相关测试通过”或“Push 成功”。

本 Skill 吸收 DeepSeek Harness `dsh-pre-push-checks` 的 Base 失效、精确 Lease、远端和 CI 检查，并保留本项目 Gate 体系；许可见 [Third-Party Notices](../THIRD_PARTY_NOTICES.md)。
