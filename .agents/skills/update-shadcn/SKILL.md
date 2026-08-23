---
name: update-shadcn
description: 更新或添加 AI API Gateway 的 shadcn 组件时使用。固定 Base UI + Nova 基线，逐文件查看官方 Registry 差异，保持 components/ui 官方原样，并验证生成 Hook 的等价行为。
---

# 更新 shadcn 组件

## 前置读取

1. `apps/web/AGENTS.md`；
2. `docs/references/official-toolchain-baseline.md`；
3. `.toolchain/baseline.json`。

## 工作流

1. 运行 `pnpm ui:info`，确认 `base=base`、`style=nova/base-nova`、Tailwind v4；
2. 检查组件是否已安装；
3. 用固定 CLI 运行 `pnpm exec shadcn add <component> --cwd apps/web --dry-run`；
4. 用 `--diff <file>` 审查每个现有文件；
5. 逐文件审查完成后，允许固定 CLI 覆盖 `components/ui`；该目录不得手工合并或由 Formatter 改写；
6. Base UI 自定义 Trigger 使用 `render`，Button-as-Link 使用真实 Link + `buttonVariants`；
7. 表单使用 `FieldGroup`、`Field`、`data-invalid` 和 `aria-invalid`；
8. 图标使用 `data-icon`，不在 Button 内手工指定图标尺寸；
9. 产品差异必须迁入全局 Token、`components/product`、Feature 或布局组合；
10. Registry 生成到 `components/ui` 之外的 Hook 进入普通 ESLint；允许等价格式化或实现调整，但必须保持导出、断点、订阅和清理行为，并更新摘要与行为测试；
11. 更新 `.toolchain/baseline.json` 中的组件、Hook 和摘要，保持 `localPatches` 为空；
12. 运行 `pnpm verify:toolchain-baseline`、`pnpm verify:toolchain-official` 和 `pnpm check:web`。

## 禁止

- 不从 GitHub Raw URL 手工覆盖组件；
- 不引入 `@radix-ui/*`；
- 不恢复 `asChild`/Slot 合同；
- 不创建平行的仿 shadcn Primitive；
- 不手工 Patch 或格式化 `components/ui`；
- 不使用 `--overwrite` 跳过逐文件差异审查。
