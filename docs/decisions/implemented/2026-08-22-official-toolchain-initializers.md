---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Decision: 工具基线优先由官方初始化器和生成器拥有

Status: implemented

## Problem

早期项目骨架依据文档手工还原了 shadcn 组件、ESLint 配置、Vite TypeScript 配置和测试入口。结果虽然外观接近目标工具，但 shadcn 实际仍使用旧 `new-york`/Radix Slot 约定，组件缺少当前 Registry 合同，Browser/Node 类型环境混合，Antfu ESLint 也没有真正成为配置基线。Agent 很容易继续复制这种近似实现，使源码与官方工具逐步分叉。

## Decision

框架和工具提供官方初始化器、Registry 或生成器时，官方输出拥有基线；项目仅维护明确登记的产品增量。Web 固定使用 shadcn `base-nova`、Base UI、Neutral Token 和 Lucide，ESLint 固定从 `@antfu/eslint-config` 组合，Vite Browser/Node TypeScript Face 分离。固定版本、官方命令、Registry 来源和本地补丁记录在 `.toolchain/baseline.json`，静态 Gate 与安装后的真实 CLI 探针共同防止回退。

网络不可用的发行构建不得伪造 CLI 执行、`pnpm-lock.yaml` 或生成客户端；必须明确保留激活检查，并在有网络环境通过官方探针后再宣称初始化完成。

## Alternatives considered

- **继续手工维护近似组件和配置。** 拒绝：需要人工跟踪上游 Schema、Primitive API、可访问性和插件组合，最容易形成第二事实来源。
- **只修改 `components.json` 并保留旧组件。** 拒绝：配置名称不会自动迁移 Radix `asChild`、Slot、表单语义和 Registry 源码。
- **每次都跟随 `latest`，不固定版本。** 拒绝：不可复现，Agent 在不同日期会得到不同代码；版本升级必须以独立 Diff 审查。
- **把全部工具输出锁死为不可修改。** 拒绝：shadcn 是 Open Code，产品可以扩展组件；但本地补丁必须最小、登记并有测试。

## Consequences

仓库需要维护工具基线清单、官方命令、静态验证器和联网探针。作为回报，Agent 可以区分“官方生成部分”和“项目拥有部分”，前端 Primitive、Lint、TypeScript Face 和测试环境不再依赖记忆同步。

## Verification

- `pnpm verify:toolchain-baseline`；
- `pnpm verify:toolchain-official`；
- `pnpm ui:info`；
- `pnpm check:web`；
- `pnpm check:ci:static`；
- Base UI Button/Field 组件测试。
