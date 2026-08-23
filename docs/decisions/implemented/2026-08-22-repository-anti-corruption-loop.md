---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Decision: 仓库使用可执行防腐闭环约束 Agent 变更

Status: implemented

## Problem

项目以 Vibecoding 为主要开发方式。随着提交数量增长，仅靠长 Prompt、人工记忆和一次性 Code Review 会导致架构边界、协议语义、生成物、文档和真实发布入口逐渐漂移。运行完整测试矩阵又会拖慢每个小改动，促使 Agent 跳过验证或积累超大 Diff。

## Decision

仓库采用一条可执行防腐闭环：显式 `change-scope` 识别真实 Diff，证据策略选择最小充分 Gate，有依赖图的 Gate Runner 执行并输出报告，高风险模块拥有生产调用点中的运行时不变量，Keyless Snapshot 验证真实组装路径，Artifact Lane 验证 plain Node/Docker 入口，逃逸缺陷通过 Postmortem 转化为永久 Guard，Phase/Release 前运行简化审计删除无主代码。

所有可机械检查的 AGENTS/Convention 承诺必须拥有返回非零退出码的命令。未知路径和无法分类的变更保守升级为完整 Gate，不静默视为安全。

## Alternatives considered

- **只扩写 AGENTS.md 和规范。** 拒绝：Agent 会漏读、误解或依据过期文字行动，且规则无法阻止合并。
- **每次本地运行完整仓库矩阵。** 拒绝：反馈成本过高，会扩大提交粒度并诱发跳过验证；完整矩阵由分 Lane CI 负责。
- **只依赖 TypeScript、Lint 和高覆盖率。** 拒绝：无法证明真实 Hono/Undici/PostgreSQL 组装、原始字节、取消传播和发布产物。
- **先快速开发，稳定后再补治理。** 拒绝：治理必须在第一条复杂纵向切片前建立，否则后续规则只能追认已经形成的平行架构。

## Consequences

仓库需要维护 Gate Runner、证据策略、不变量清单、协议 Fixture、Decision/Postmortem 格式和删熵工具；这些本身也要有自测。作为回报，提交数量不再直接扩大未验证语义增量，Agent 无需记住全部历史也能在错误路径上快速失败。

## Verification

- `pnpm test:scripts`；
- `pnpm change-scope --base <confirmed-base>`；
- `pnpm evidence:select --base <confirmed-base>`；
- `pnpm verify:runtime-invariants`；
- `pnpm verify:decisions`；
- `pnpm check:protocol` 的 Keyless 真实组合 Snapshot；
- `pnpm check:artifact`；
- `pnpm hygiene`。
