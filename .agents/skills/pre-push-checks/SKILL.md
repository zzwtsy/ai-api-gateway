---
name: pre-push-checks
description: 推送、标记完成或宣称检查通过前，基于已确认 Base 选择并运行最小充分证据。
---

# 推送前检查

1. 确认工作区和分支：`git status --short --branch`；
2. 从当前 PR、分支关系或用户要求确认 Base，不让脚本猜测；
3. 运行 `pnpm change-scope --base <confirmed-base>`；
4. 运行 `pnpm evidence:select --base <confirmed-base>`；
5. 阅读输出的风险信号和推荐命令，补充选择器无法理解的动态/构建入口；
6. 每个行为变化至少运行一个会为该回归变红的聚焦测试；
7. 只有跨仓库修改、未知路径、发布演练或 CI 诊断才运行 `pnpm check:all`；
8. 必需 Gate 失败时停止，不降低规则、不使用 `passWithNoTests`；
9. 报告精确命令、结果、未验证项和剩余风险。

常见升级：

- 公开 OpenAPI 或生成客户端：`pnpm check:control`；
- 协议、Header、Streaming 或取消：`pnpm check:protocol`；
- 数据库或耐久格式：`pnpm check:db`；
- 构建、入口或 Docker：`pnpm check:artifact`；
- 文档、AGENTS、Skill、Decision：`pnpm check:docs`；
- 阶段收口或发布前：`pnpm hygiene` + `pnpm check:all`。
