---
name: execution-plan
description: 用于跨模块、协议、数据库 Schema、安全、生命周期或多阶段修改。
---

# 执行计划

修改跨越 Feature 边界或改变耐久合同时，实施前创建 `docs/plans/<kebab-topic>.md`。

必须包含：

```markdown
# <主题>

Status: draft

## 目标与范围
## 明确不在范围
## 当前证据
## 决策
## 新增或修改文件
## 实施步骤
## 验证命令
## 风险与回滚
## 文档与 Decision Note
```

规则：

- 基于当前源码和测试，不基于记忆或旧 Decision Note；
- 每一步写明所属模块；
- 验证使用 `ai/change-evidence-matrix.md` 中的具体命令；
- 显式排除范围，防止 Agent 扩张任务；
- 中文写计划，代码标识符和命令保持英文；
- 完成后删除或归档临时计划，耐久事实回到 Convention、Architecture 和 Decision Note。
