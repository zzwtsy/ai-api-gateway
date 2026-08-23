---
status: normative
last_reviewed_at: 2026-08-23
language: zh-CN
---

# Decision: shadcn Registry 保持官方源码，产品差异由项目拥有层表达

Status: implemented

## Problem

在 Registry Primitive 中加入状态 Variant 或中文默认文案，会让官方 CLI 更新变成逐项手工合并；Formatter 还可能只重排源码却改变摘要。Primitive、产品语义和生成工具因此形成混合所有权，官方 Diff 无法直接判断真实漂移。

## Decision

`apps/web/src/components/ui` 保持固定 shadcn CLI 的官方 Registry 输出，不接受手工 Patch 或 Formatter 改写。更新前必须执行 `info`、`add --dry-run` 和逐文件 `--diff`；审查完成后允许 CLI 覆盖官方文件，并刷新组件摘要。

Registry 生成到目录外的 Hook 进入普通 ESLint。允许 Formatter 或项目实现作等价调整，但必须保持公开导出、断点、订阅和清理行为，并刷新摘要与行为测试。官方 CLI 探针仍验证 Hook 可以生成，但不要求它与工作区逐字节一致。

产品差异进入全局语义 Token、`components/product`、Feature 或布局组合。状态语义由 `StatusBadge` 拥有，Spinner 的中文可访问名称由产品调用方显式传入。ESLint 只忽略 `components/ui`。SHA-256 摘要只记录离线已评审内容；组件官方来源由隔离目录中的固定 CLI 覆盖生成及逐字节比较证明，目录外 Hook 由 TypeScript、ESLint 和行为测试验证。

Web 采用 Preset `b1Ymqvgiu` 的 `base-nova + Blue + Inter` 主题。App Shell 使用官方 Sidebar 的 `inset + icon` 组合，Sidebar Provider 拥有非敏感 Cookie 和键盘折叠状态；项目只组合导航、Topbar 和产品文案。

## Alternatives considered

- **继续允许登记后的最小 Patch。** 拒绝：每次 Registry 更新仍需人工区分业务语义与上游变化，长期成本与补丁数量一起增长。
- **Fork 官方 Primitive。** 拒绝：会复制可访问性、Portal、交互状态和 Base UI 适配的维护责任。
- **不记录源码摘要，只依赖 CLI。** 拒绝：离线审查和 CI 无法发现未登记修改，CLI 网络失败也会失去静态保护。
- **把产品状态直接改成官方通用 Variant。** 拒绝：成功和警告是产品语义，不能挤占 Primary，也不能丢失跨页面一致映射。

## Consequences

官方升级路径更直接，Registry 所有权可以机械验证；产品状态和中文可访问性也有明确拥有者。代价是调用方必须显式表达产品语义，CLI 输出中少量英文内部可访问文案不能通过本地补丁替换。

## Verification

- `pnpm ui:info`；
- 对全部 Registry 项运行固定 CLI 的 `--dry-run` 与逐文件 `--diff`；
- `pnpm verify:toolchain-baseline`；
- `pnpm verify:toolchain-official` 隔离重生成、组件逐字节比较与 Hook 生成检查；
- `pnpm check:web`；
- Sidebar、StatusBadge、Spinner 与 Portal 叠层行为测试。
