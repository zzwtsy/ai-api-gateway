---
status: normative
last_reviewed_at: 2026-08-23
language: zh-CN
---

# Decision: 仓库脚本使用 Node.js 原生 TypeScript

Status: implemented

## Problem

应用源码由 TypeScript 6 严格检查，但根配置、Gate、生成器、发布工具及其测试仍以 `.mjs` 和 JSDoc 类型维护。脚本是 CI、发布和仓库治理的真实入口，却没有获得与应用源码一致的编译期反馈，并形成 JavaScript 与 TypeScript 两套维护表面。

## Decision

全部项目拥有的仓库脚本和根 JavaScript 配置使用 `.ts`。Node.js 24 通过原生 type stripping 直接运行这些文件；独立的脚本 TypeScript Project 启用全仓库严格选项与 `erasableSyntaxOnly`，并进入根 `typecheck` 和常规 Gate。脚本内部相对 import 指向真实 `.ts` 文件，不增加预编译步骤或第二个 TypeScript 运行器。

编译后的应用继续由 `tsc` 生成 `.js` 并通过 plain Node 运行；应用源码中为 NodeNext 输出保留的 `.js` import specifier 不属于本决策的迁移范围。

## Alternatives considered

- **引入 `tsx` 执行仓库脚本。** 它可以运行更广泛的 TypeScript 语法，但当前脚本只需要可擦除类型；额外运行器增加依赖、启动路径和发布治理面，没有提供当前合同需要的能力。
- **先用 `tsc` 编译脚本再执行。** 这会增加脚本构建目录、新鲜度和入口选择问题，并使低延迟 Hook 与生成器依赖额外步骤。
- **保留 `.mjs` 并启用 `checkJs`。** 它能改善部分类型反馈，但继续维护 JSDoc 类型和 JavaScript/TypeScript 双表面，不能满足全仓库脚本统一使用 TypeScript 的目标。

## Consequences

- 项目拥有的根配置与 `scripts/**` 只维护 TypeScript 源码；应用构建产物仍由 `tsc` 生成 `.js` 并通过 plain Node 验证。
- `scripts/tsconfig.json` 位于脚本目录内，使 Project Service 自动发现 `scripts/**/*.ts`；根 TypeScript 配置文件通过 ESLint 的窄范围配置显式关联同一 Project。
- Node.js 原生 TypeScript 只支持可擦除语法，因此 `erasableSyntaxOnly` 是脚本 Project 的强制约束。
- ESLint、commitlint、生成器、Gate Runner、Release Workflow、Hook 和测试直接执行 `.ts` 入口；生态工具升级必须继续验证真实 CLI 加载行为。
- 路径字符串分布在脚本、Workflow 和 Fixture 中，因此脚本测试、Gate 合同与旧路径扫描共同防止入口漂移。

## Verification

- `pnpm typecheck:scripts`；
- `pnpm test:scripts`；
- `pnpm exec eslint scripts eslint.config.ts commitlint.config.ts`；
- `pnpm verify:toolchain-official`；
- `pnpm check:quick`；
- `pnpm check:docs`；
- `pnpm build`；
- `pnpm exec node scripts/artifact/smoke.ts`；
- `git diff --check`。
