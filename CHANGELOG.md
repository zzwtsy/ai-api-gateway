# 变更日志

本项目仍处于预发布阶段。版本记录描述当前仓库能力，不承诺配置、数据库或公开 API 向后兼容。

## 0.1.0-alpha.3 — 2026-08-22

### 重建初始化基线

- 以 shadcn CLI `4.19.0` 的 `base-nova` 契约为准，基础组件切换为 Base UI；
- 移除 `@radix-ui/react-slot` 和 `asChild` 旧 API，链接按钮改为真实链接配合 `buttonVariants`；
- 使用完整 `FieldGroup / Field` 表单组合，补齐 `data-invalid`、`aria-invalid` 和错误提示关联；
- 以 `@antfu/eslint-config 9.3.0` 为通用 ESLint 基线，叠加 Gateway、Web Feature 和 shadcn 源组件边界规则；
- 将 Web TypeScript 配置拆为 Browser App 与 Node Tooling 两个 Project Reference；
- 建立 JSDOM、Testing Library 和 Base UI 组件测试基线；
- 增加 `verify:toolchain-baseline` 与联网官方探针，阻止 Primitive、Preset、依赖或生成物静默漂移。

### 依赖与配置

- 固定 `@base-ui/react 1.7.0`、`shadcn 4.19.0` 和 `@antfu/eslint-config 9.3.0`；
- 将 `tailwind-merge` 升级到支持 Tailwind CSS 4.3 的 `3.6.0`；
- 更新 React、Playwright、Pino 和 Lucide 的受控版本；
- 保持 TypeScript `6.0.3` 为全仓库唯一版本，不引入 TypeScript 7 或双编译器。

### 激活要求

当前归档环境无法访问 npm Registry，因此本版本按固定的官方源码与契约重建，但仍需在联网 Node.js 24 环境完成 `pnpm install`、`shadcn info`、正式 OpenAPI 客户端生成、TypeScript 6 语义检查和完整 Artifact Gate。

## 0.1.0-alpha.2 — 2026-08-22

### 新增

- 引入有依赖图、有限并发和机器可读报告的 Gate Runner；
- 引入显式 `change-scope` 与基于路径/风险的证据选择；
- 为 Routing、Transport、Recording、Observation 和 Shutdown 建立运行时不变量所有权；
- 增加 Keyless 真实 Hono 组合协议 Snapshot、随机 Provider 字段与路由性质测试；
- 增加源码模块图生成与新鲜度检查；
- 增加 Decision Note 生命周期校验、Postmortem 工作流和阶段性简化审计；
- 增加 Knip、jscpd、编译产物浏览器测试和 Docker Compose Smoke；
- 将 CI 收敛为 Static、Core、Protocol 和 Artifact 四条证据 Lane。

### 强化

- 数据库强制同一 Request 内 Attempt 序号唯一；
- Docker 构建强制使用 `pnpm-lock.yaml` 和冻结安装；
- Git Hook 保持快速，完整证据由 CI 承担；
- 中文优先文档、Agent 资产、生成规范与项目版本继续由机械检查保持一致。

### 激活要求

源码归档仍不伪造无法在当前环境验证的 `pnpm-lock.yaml` 和正式 OpenAPI 客户端。首次激活必须按 `docs/checklists/repository-activation.md` 完成安装、生成和全量验证。
