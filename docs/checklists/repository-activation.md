---
status: active
last_reviewed_at: 2026-08-23
language: zh-CN
---

# 仓库首次激活清单

从源码归档创建真实 Git 仓库后执行一次：

- [ ] 安装 Node.js 24，并启用 Corepack；
- [ ] 运行 `pnpm install`，审查依赖树并生成 `pnpm-lock.yaml`；
- [ ] 运行 `pnpm verify:toolchain-baseline`，确认提交源码仍符合 Base UI / Antfu 固定基线；
- [ ] 运行 `pnpm ui:info` 和 `pnpm verify:toolchain-official`，确认真实 shadcn CLI 识别为 Base UI + Nova + Tailwind v4；
- [ ] 确认根目录是 `typescript@6.0.3` 唯一所有者；
- [ ] 提交生成的 `pnpm-lock.yaml`；
- [ ] 运行 `pnpm api:generate`，审查 `apps/web/src/api/schema.d.ts`；
- [ ] 运行 `pnpm --filter @aigw/web exec vite build`，确认 Router Plugin 已按 `apps/web/src/routes/` 重生成 `apps/web/src/routeTree.gen.ts`，且生成文件无手工改动；
- [ ] 初始化 Git，运行 `node scripts/install-lefthook.mjs`；
- [ ] 复制 `.env.example` 为 `.env`，替换所有占位 Secret；
- [ ] 运行 `pnpm db:start` 和 `pnpm db:migrate`；
- [ ] 使用非占位密码运行 `pnpm db:bootstrap`；
- [ ] 运行 `pnpm docs:bundle` 和 `pnpm docs:check`；
- [ ] 运行 `pnpm test:scripts` 和 `pnpm verify:gate-contract`；
- [ ] 运行 `pnpm check:quick`；
- [ ] 运行 `pnpm check:control`；
- [ ] 运行 `pnpm check:protocol`；
- [ ] Docker 可用时运行 `pnpm check:db`；
- [ ] 运行 `pnpm exec playwright install chromium`，再执行 `pnpm check:e2e`；
- [ ] 运行 `pnpm hygiene`；
- [ ] 运行 `pnpm check:artifact`（需要 Docker）；
- [ ] Lockfile、正式 OpenAPI 类型与 Router 生成树提交后再启用 GitHub CI；
- [ ] 补充正式 `LICENSE` 和第三方许可证清单后再公开发布。
