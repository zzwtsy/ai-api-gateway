# Web 控制面规则

- `src/routes/` 是页面装配层；Feature 不直接依赖另一个 Feature，跨 Feature 组合放在 Route 或 `routes/-*` 忽略目录；
- Feature 内部按业务任务、稳定生命周期或独立状态边界按需切片；`components/`、`hooks/`、`lib/` 不是强制目录，子切片仍属于原 Feature，Route 使用 Feature 根目录的稳定入口；
- 路由固定使用 TanStack Router 文件路由；`src/routeTree.gen.ts` 由 Router Plugin 生成，禁止手工修改；
- `docs/product/ux/page-contracts.json` 描述产品目标页面全集，`src/routes/-page-manifest.ts` 只登记已交付导航页面；已交付页面的 ID、Path、中文标签、导航分组和生成路由必须通过 `pnpm verify:web-contracts` 保持一致；
- 服务端状态放在 TanStack Query；同一个 `QueryClient` 注入 Router Context，Loader 预取使用 `ensureQueryData` 复用 Query Cache；可分享筛选和选中 ID 放在 Router Search Params；
- `src/api/schema.d.ts` 从控制面 OpenAPI 生成，依赖安装后不得手工修改；`src/api/` 除生成物外不得放手写请求代码；
- 控制面请求固定使用 `openapi-typescript + openapi-fetch + openapi-react-query`；Fetch 运行时配置放在 `src/lib/api-runtime/`；
- `src/components/ui/` 是 shadcn Registry-owned 目录，只允许已登记的 shadcn 组件源码；禁止放测试、业务组件、Wrapper、Hook、Helper 或手写新组件；测试放 `src/test/shadcn/`；
- shadcn 固定使用 `base-nova + Blue + Inter` + Base UI；新增或更新组件必须使用固定版本官方 CLI 的 `info`、`add --dry-run` 和逐文件 `--diff` 流程；
- 禁止 `@radix-ui/*`、`asChild` 和 Slot 合同；Base UI 自定义 Trigger 使用 `render`，Button-as-Link 使用真实 Link + `buttonVariants`；
- 表单使用 `FieldGroup` + `Field`，校验状态分别放在 `data-invalid` 与 `aria-invalid`；
- 使用 shadcn 源组件和语义化 CSS Token，不创建平行的一次性控件体系；
- Gateway Client Key 和 Provider Credential 不进入浏览器持久化；
- 开发控制面令牌只由 Vite Development Mode 注入；生产环境使用 Better Auth Cookie；
- 用户界面默认使用简体中文，内部枚举必须映射为中文标签；
- 代码标识符、Route Path、API 字段和 Error Code 保持英文；
- Request/Attempt 等显示映射优先放在无 React、Query 或浏览器依赖的 Feature View Model 中；`unknown`、无数据和 `0` 不得合并；
- 数据页面首次失败、成功空状态和有缓存的刷新失败必须互斥；局部请求失败只替换其拥有区域，并提供明确重试入口；
- 修改可见页面、路由、布局、产品组件、shadcn Primitive 或 Theme 时同步 `docs/product/ux/` 对应规范，并运行选择器要求的真实浏览器证据；纯 Hook 或纯 View Model 变更不因此自动要求 E2E。

## 工具基线

- 先读 `docs/references/official-toolchain-baseline.md` 和 `.toolchain/baseline.json`；
- 修改 Primitive 后运行 `pnpm verify:toolchain-baseline`、`pnpm verify:toolchain-official`、`pnpm check:web`；
- `components/ui/**` 必须保持官方输出，不接受手工补丁或 Formatter 改写；Registry 生成的外部 Hook 进入普通 ESLint，但修改必须保持导出和行为合同，并由摘要与行为测试保护。CLI 覆盖前逐文件审查，产品差异迁入 Token、`components/product` 或布局组合。
