---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Decision: 以可执行证据约束 Vibecoding

Status: implemented

## Problem

AI 可以快速生成大量看似合理的代码，但容易遗漏生成客户端、破坏模块边界、只运行无关测试或依据过时文档修改。仅靠 Prompt 和 Code Review 无法稳定防止这些问题。

## Decision

仓库使用文档路由、局部 AGENTS、机器边界、Decision Note、Keyless Snapshot、Generated Freshness、Source/Artifact 双路径和变更证据矩阵。每次变更运行最小充分验证，CI 负责完整矩阵。

## Alternatives considered

- **每次让 Agent 运行全套检查。** 拒绝：反馈过慢，导致 Agent 更可能跳过验证，也浪费无关资源。
- **只依赖类型检查。** 拒绝：无法证明协议字节、数据库副作用、Secret 和发布产物。
- **只写更长的 AGENTS.md。** 拒绝：规则没有机器对应物时仍会漂移或被忽略。

## Consequences

项目需要维护 Gate Runner、Fixture、Agent Asset Check 和文档路由，但能把高风险规则转化为自动反馈。完成报告必须列出实际命令和未验证项。

## Verification

- `docs/conventions/quality-gates-and-evidence.md`；
- `ai/change-evidence-matrix.md`；
- CI quality/gateway/web/artifact-e2e Lane；
- Agent Asset Freshness Test。
