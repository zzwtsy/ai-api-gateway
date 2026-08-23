---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Decision: TypeScript 6 单版本

Status: implemented

## Problem

项目需要严格 TypeScript、稳定 IDE 体验和一致 CI，但双版本或 Native Preview 会让编译器、Lint Plugin、编辑器和构建脚本读取不同 API，增加 vibecoding 排障成本。

## Decision

全仓库使用 TypeScript 6.x 的一个稳定补丁版本。根 Workspace 是唯一版本声明位置；所有 App 和工具解析到同一可执行文件。禁止 TypeScript 7、`@typescript/native`、`@typescript/typescript6` 和 Workspace Major 漂移。

## Alternatives considered

- **TypeScript 7 + TypeScript 6 兼容别名。** 拒绝：需要维护两个编译器面，用户已明确不采用双版本。
- **每个 Workspace 自己声明 TypeScript。** 拒绝：容易产生补丁和 Major 漂移，IDE 与 CI 难以复现。
- **暂时停留 TypeScript 5。** 拒绝：新项目没有历史兼容负担，TypeScript 6 已满足稳定单版本目标。

## Consequences

工具链选择必须兼容 TypeScript 6。升级 TypeScript Major 需要新 Decision Note、完整 Workspace Typecheck 和生成物验证。项目不会使用 TypeScript 7 Native Compiler 的加速能力，换取更简单且一致的开发面。

## Verification

- `verify:typescript-version` 扫描所有 `package.json`；
- Frozen Lockfile 只能解析一个 TypeScript 版本；
- 全 Workspace `tsc -b`；
- Agent Asset Gate 禁止双版本安装说明。
