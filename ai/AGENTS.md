# AI 开发资产

本目录保存 Agent 任务路由、编码不变量、黄金路径和验证矩阵，不包含产品运行时代码。

- `coding-invariants.md`：不可破坏且应机器化的规则；
- `implementation-context.md`：固定技术基线和目录职责；
- `golden-paths.md`：新 Feature 优先复制的完整链路；
- `change-evidence-matrix.md`：变更与最小充分证据；
- `review-checklist.md`：评审收口；
- `task-breakdown.md`：目标阶段拆分；
- `execution-plan-template.md`：非平凡工作计划模板；
- `decision-note-template.md`：长期决策模板。

AI 资产默认使用中文。代码、命令、路径和协议标识符保持原样。命令或路径变化时必须在同一 PR 更新，`pnpm verify:agent-assets` 和 `pnpm docs:check` 检查新鲜度。
