---
status: normative
last_reviewed_at: 2026-08-23
language: zh-CN
---

# Decision: Web 使用文件路由与 OpenAPI TypeScript 原生 Query 链路

Status: implemented

## Problem

早期 Web 骨架使用手工 `createRoute().addChildren()`、独立 `pages/`、Feature 手写 API Wrapper 与 Query Key；同时 `components/ui` 中混入了组件测试。它们都形成了额外维护面：路由树需要人工同步，API Path/参数/Query Key 出现重复字符串，shadcn Registry-owned 源码区也不再能安全地由官方 CLI 更新。参考 `hono-openapi-starter` 已证明文件路由、薄 Route 与垂直 Feature 的目录形态更适合长期 AI 协作，但其 Alova/Wormhole 请求方案会与本项目既定的 TanStack Query 服务端状态层重叠。

## Decision

Web 固定使用 TanStack Router 文件路由：`src/routes/` 是页面装配层，`@tanstack/router-plugin/vite` 生成 `routeTree.gen.ts` 并启用 Automatic Code Splitting；Route 文件保持薄，业务实现留在 Feature，跨 Feature 页面装配放在 Route 或 `routes/-*`。

控制面请求固定采用 `openapi-typescript → openapi-fetch → openapi-react-query → TanStack Query`。`src/api/` 只保存 OpenAPI 生成类型；Fetch 的认证/Base URL 运行时配置放在 `src/lib/api-runtime/`；Query Key 由 HTTP method/path/params 自动派生；同一个 `QueryClient` 同时供 `QueryClientProvider` 和 Router Context 使用，Loader 预取复用 Query Cache；TanStack Query 是唯一 server-state owner。

`src/components/ui/` 固定为 shadcn Registry-owned 目录，只允许 `.toolchain/baseline.json` 中登记的组件源码。测试移动到 `src/test/shadcn/`，产品组件和 Wrapper 放到 `components/product|layout` 或 Feature。静态 Toolchain Gate 会拒绝任何额外文件。

## Alternatives considered

- **Alova + Wormhole。** 参考仓库已使用，生成与请求能力完整；拒绝作为本项目基线，因为 Alova 自带请求状态、缓存和请求共享，和现有 TanStack Query 形成双重 server-state ownership。
- **Orval。** React Query/Fetch 生成能力成熟，适合希望按 operationId 生成大量 SDK/Hook/Mock 的项目；当前项目只需要严格类型和 Query 集成，生成面更大而收益有限。
- **Hey API OpenAPI TypeScript。** SDK、Fetch、TanStack Query、Validator 插件完整；当前仍处于快速演进的 0.x 线，会扩大生成代码与升级 Surface，暂不作为基础设施默认。
- **Kubb。** 插件式 TypeScript/Zod/React Query 生成能力强；当前大版本刚更新，先不把新 Alpha 项目绑定到更高工具链 churn。
- **Axios、Ky、ofetch 等独立请求库。** 作为通用 HTTP Client 都可用，但本项目已有 OpenAPI Schema 与浏览器原生 Fetch，额外 Transport Abstraction 不解决新的问题。
- **继续手写 `api.ts` + Query Key。** 拒绝：Path、参数、响应类型和 Cache Identity 会产生第二事实来源。

## Consequences

前端路由新增/删除主要通过文件系统完成，Router Plugin 负责类型化路由树；生成文件和 shadcn Registry 区有清晰所有权。控制面请求不会生成庞大的 SDK，Feature 直接消费类型安全 Query Options/Mutation，同时仍能保留业务级 `select`、失效策略和错误展示。代价是 OpenAPI Envelope 仍需 Feature 显式映射，且 `openapi-react-query` 作为薄适配层需要锁定版本并随 TanStack Query/OpenAPI TypeScript 生态验证升级。

## Verification

- `pnpm verify:toolchain-baseline`；
- `pnpm verify:boundaries`；
- `pnpm api:generated:check`；
- `pnpm docs:module-graph:check`；
- `pnpm check:web`；
- `apps/web/src/components/ui/` 不允许出现基线列表之外的文件；
- `apps/web/src/routeTree.gen.ts` 必须由 Router Plugin 生成且不接受手工业务实现。
