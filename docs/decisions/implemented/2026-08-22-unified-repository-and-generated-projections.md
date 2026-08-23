---
status: active
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Decision: 规范与实现合并为单一仓库，交付物由同一 Commit 生成

Status: implemented

## Problem

工程规范和项目模板曾作为两个独立归档维护，并使用不同版本线。随着源码开始实现真实 Feature，同一 Route、目录边界、技术版本和 UI 状态需要在两个项目中同步，容易形成相互冲突的事实来源，也让 Agent 无法判断应该信任规范、模板还是当前代码。

## Decision

把源码、模块化规范、Decision Note、Agent 规则、测试和生成脚本合并到 `ai-api-gateway` 单一仓库。项目只维护一个 SemVer 版本，由根 `package.json` 和 Git Tag 表示。

模块化 `docs/` 是规范维护源；完整规范、工程规范和前端规范通过 `pnpm docs:bundle` 生成到 `.artifacts/spec/`。源码归档、规范归档、OpenAPI 和容器镜像都从同一个 Commit 生成，生成投影不反向成为第二个事实来源。

历史独立规范和模板由旧归档、Release 和 Git 历史保存，不复制到活动 `docs/old` 或版本目录。

## Alternatives considered

- **继续维护规范仓库和模板仓库。** 拒绝：每次行为变化需要人工同步两套版本，Vibecoding 中极易漂移。
- **把全部规范压成根目录一份大 Markdown。** 拒绝：上下文过大、Diff 噪声高、局部 Owner 不清晰；单文件只适合作为生成投影。
- **删除规范，只保留代码。** 拒绝：产品语义、未实现目标、替代方案和安全边界无法仅由当前代码表达。

## Consequences

- 当前源码、文档和 Gate 可以在同一 PR 中评审；
- 项目版本不再与“规范版本”“模板版本”分离；
- 需要维护规范打包脚本和文档新鲜度检查；
- 生成规范不能手工修补，任何修正必须回到模块化源文档；
- 后续若提取通用 Starter，必须有两个真实消费项目或独立发布需求。

## Verification

- 根包名为 `ai-api-gateway`，所有 Workspace 使用同一项目版本；
- `docs/spec-bundles.json` 和 `scripts/docs/bundle-spec.ts` 可生成三个规范投影；
- `pnpm docs:check` 拒绝旧版本路径、失效链接和独立规范入口；
- 活动仓库中不存在 `PROJECT_ARCHITECTURE.md`、旧版本规范副本或独立模板版本声明。
