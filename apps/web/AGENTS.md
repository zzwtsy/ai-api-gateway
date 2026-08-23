# Web 控制面规则

- `src/routes/` 是页面装配层；Feature 不直接依赖另一个 Feature，跨 Feature 组合放在 Route 或 `routes/-*` 忽略目录；
- 路由固定使用 TanStack Router 文件路由；`src/routeTree.gen.ts` 由 Router Plugin 生成，禁止手工修改；
- 服务端状态放在 TanStack Query；同一个 `QueryClient` 注入 Router Context，Loader 预取使用 `ensureQueryData` 复用 Query Cache；可分享筛选和选中 ID 放在 Router Search Params；
- `src/api/schema.d.ts` 从控制面 OpenAPI 生成，依赖安装后不得手工修改；`src/api/` 除生成物外不得放手写请求代码；
- 控制面请求固定使用 `openapi-typescript + openapi-fetch + openapi-react-query`；Fetch 运行时配置放在 `src/lib/api-runtime/`；
- `src/components/ui/` 是 shadcn Registry-owned 目录，只允许已登记的 shadcn 组件源码；禁止放测试、业务组件、Wrapper、Hook、Helper 或手写新组件；测试放 `src/test/shadcn/`；
- shadcn 固定使用 `base-nova` + Base UI；新增或更新组件必须使用固定版本官方 CLI 的 `info`、`add --dry-run` 和 `--diff` 流程；
- 禁止 `@radix-ui/*`、`asChild` 和 Slot 合同；Base UI 自定义 Trigger 使用 `render`，Button-as-Link 使用真实 Link + `buttonVariants`；
- 表单使用 `FieldGroup` + `Field`，校验状态分别放在 `data-invalid` 与 `aria-invalid`；
- 使用 shadcn 源组件和语义化 CSS Token，不创建平行的一次性控件体系；
- Gateway Client Key 和 Provider Credential 不进入浏览器持久化；
- 开发控制面令牌只由 Vite Development Mode 注入；生产环境使用 Better Auth Cookie；
- 用户界面默认使用简体中文，内部枚举必须映射为中文标签；
- 代码标识符、Route Path、API 字段和 Error Code 保持英文；
- 修改页面时同步 `docs/product/ux/` 对应规范和浏览器证据。

## 工具基线

- 先读 `docs/references/official-toolchain-baseline.md` 和 `.toolchain/baseline.json`；
- 修改 Primitive 后运行 `pnpm verify:toolchain-baseline`、`pnpm verify:toolchain-official`、`pnpm check:web`；
- shadcn Registry 源码允许最小本地补丁，但必须登记、刷新组件摘要并增加行为测试。
