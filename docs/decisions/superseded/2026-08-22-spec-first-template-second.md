---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Decision: 先固化工程规范，再生成薄项目模板

Status: superseded — 薄模板验证完成后，规范与实现已合并为单一仓库

> 该决策解释了为什么先生成薄模板。模板验证完成后，交付形态已由 [单一仓库与生成投影](../implemented/2026-08-22-unified-repository-and-generated-projections.md) 取代。

## Problem

直接生成完整项目会把尚未明确的 Route 边界、流观测 API、质量门禁和 AI 工作方式固化为代码；继续只写文档又无法验证规范是否可实现。

## Decision

v0.3.0 先完成工程规范。下一产物是独立版本的薄模板 v0.1.0，只实现工程 Spine、Control Golden Path 和 Data Golden Path。模板实现中发现的冲突必须反馈修正规范或记录 Decision Note。

## Alternatives considered

- **立即生成完整业务项目。** 拒绝：范围过大，难以判断问题来自架构还是具体 Feature。
- **继续完善所有细节后再写任何代码。** 拒绝：会形成无法由真实工具链验证的纸面架构。
- **只生成空目录。** 拒绝：无法验证 OpenAPI、Streaming、数据库、UI 和质量 Gate 的端到端闭环。

## Consequences

设计规范和模板拥有独立版本。模板不是完整产品，但必须真实运行、构建并通过 Artifact E2E。下一阶段工作重点从规范编写切换到参考实现。

## Verification

- 历史设计归档中的项目模板生成合同；
- 模板 v0.1.0 两条 Golden Path；
- Template Validation Report；
- 规范与模板差异 Ledger。
