---
name: update-shadcn
description: 更新或添加 AI API Gateway 的 shadcn 组件时使用。固定 Base UI + Nova 基线，先查看官方 Registry 差异，再合并项目补丁。
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
5. 没有本地补丁的文件可按 Registry 更新；有补丁的文件逐项合并；
6. Base UI 自定义 Trigger 使用 `render`，Button-as-Link 使用真实 Link + `buttonVariants`；
7. 表单使用 `FieldGroup`、`Field`、`data-invalid` 和 `aria-invalid`；
8. 图标使用 `data-icon`，不在 Button 内手工指定图标尺寸；
9. 新增本地补丁时更新 `.toolchain/baseline.json`，并刷新对应组件的 `componentDigests`；
10. 运行 `pnpm verify:toolchain-baseline`、`pnpm verify:toolchain-official` 和 `pnpm check:web`。

## 禁止

- 不从 GitHub Raw URL 手工覆盖组件；
- 不引入 `@radix-ui/*`；
- 不恢复 `asChild`/Slot 合同；
- 不创建平行的仿 shadcn Primitive；
- 不使用 `--overwrite` 跳过本地补丁审查。
