---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Decision: 模块化单体优先，不建立通用插件运行时

Status: implemented

## Problem

Provider、PayloadStore 和 Transport 存在可替换实现，但项目当前是个人自托管单机应用。通用插件系统会引入动态加载、版本兼容、生命周期、配置发现和第三方安全边界，而没有真实外部生态消费者。

## Decision

MVP 使用一个 Node.js 部署单元和显式 Application Composition。可替换能力通过小型 TypeScript Interface、静态 Registry 和依赖注入实现。只有出现稳定第三方扩展需求时，才设计版本化插件 API。

## Alternatives considered

- **Everything is a plugin。** 拒绝：适合 Agent Harness 的广泛运行时组合，不符合当前 Gateway 的需求规模。
- **从第一天拆成微服务。** 拒绝：增加分布式状态、部署和观测复杂度。
- **所有实现直接硬编码。** 拒绝：Transport、Clock、PayloadStore 和 SecretCipher 需要可测试替换点。

## Consequences

代码必须保持清晰模块边界，但不会为每个能力创建动态 Loader。未来插件化必须通过新 Decision Note，定义兼容性、安全和卸载语义。

## Verification

- Repository Boundary Gate；
- Composition Root 可测试导入；
- 无运行时文件扫描插件加载；
- Mock Provider/Clock/PayloadStore 可注入。
