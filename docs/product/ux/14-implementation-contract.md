---
status: normative
last_reviewed_at: 2026-08-25
language: zh-CN
---

# 前端实现契约

## 1. 技术基线

```text
React + Vite + TypeScript 6.x（全仓库单版本）
shadcn/ui 4.x（`base-nova`）
Base UI 1.x
Tailwind CSS 4.x
TanStack Router
TanStack Query
TanStack Table
TanStack Virtual
React Hook Form
Zod
Recharts through shadcn Chart
openapi-typescript + openapi-fetch + openapi-react-query
```

全仓库只允许一个 TypeScript 6.x 稳定补丁版本。前端不得声明独立 TypeScript Major，也不得引入 TypeScript 7、Native Compiler 或双版本兼容别名。

`components.json` 是 shadcn 配置事实来源。当前固定 `base-nova`、Base UI、Lucide 和 Tailwind CSS v4；Primitive base、style、icon library、alias 和 Tailwind 版本必须从该文件读取。不得在代码中假设、混用或静默切回 Radix API。

## 2. 目录与边界

```text
src/
├── routes/                   # TanStack Router 文件路由；只做 URL/Loader/Search/Layout/页面装配
│   ├── __root.tsx
│   ├── _workspace.tsx        # Pathless Layout
│   ├── _workspace/
│   └── -components/          # Router 忽略的跨 Feature 页面装配组件
├── features/                 # 垂直 Feature；Feature 之间不得直接导入
├── components/
│   ├── ui/                   # shadcn Registry-owned；禁止项目手写文件/测试/Wrapper
│   ├── layout/               # 跨页面布局
│   └── product/              # 纯跨 Feature 产品组件
├── api/                      # OpenAPI 生成物；当前为 schema.d.ts，禁止手工请求代码
├── lib/
│   ├── api-runtime/          # openapi-fetch / openapi-react-query 运行时配置
│   ├── query-client.ts       # TanStack Query 单例；同时注入 Router Context
│   ├── format/
│   └── validation/
├── test/
│   └── shadcn/               # shadcn 行为测试，不污染 components/ui
├── app.tsx                   # 全局 Provider + RouterProvider
├── router.tsx                # 只消费 routeTree.gen.ts
├── routeTree.gen.ts          # Router Plugin 生成，禁止手工修改
├── main.tsx
└── index.css
```

`App` 只负责全局 Provider 与 Router 装配，不承载页面实现。`QueryClient` 是单例，并注入 TanStack Router Context，使 Route Loader 可以复用 Feature 的 OpenAPI Query Options 执行 `ensureQueryData`/Prefetch，而不是建立第二套 Loader Cache。路由必须使用 `@tanstack/router-plugin/vite` 文件路由，Route 文件保持薄：URL、Search Params、Loader、Layout 与 Feature 页面装配留在 `routes/`；业务 UI/Query/Form 留在 Feature。跨 Feature 页面组合放在 Route 或 `routes/-*` 忽略目录，不能通过一个 Feature 反向导入另一个 Feature。

`page-contracts.json` 拥有产品目标页面全集；`routes/-page-manifest.ts` 只拥有当前已交付且进入导航的页面集合。App Shell 从 Manifest 派生导航、分组、当前标题和 Active 状态。静态合同 Gate 校验已交付页面的 ID、Path、中文标签、导航分组、生成路由和已落地布局 Token；计划页面可以只存在于产品合同中，不得提前进入已交付导航。

目标页面区域生命周期由 `page-contracts.json` 表达；必需状态的 Scenario ID 必须关联真实 Component 或 Playwright 测试源码。该 Gate 只证明结构与关联存在，不执行场景，也不代替浏览器证据。

## 3. shadcn 约束

- 添加组件前先检查已安装组件并读取当前官方文档；
- 使用项目声明的 package manager 和固定的 shadcn CLI 执行初始化、添加与更新；
- 现有项目切换 Preset 使用官方 `shadcn apply`，组件更新先执行 `--dry-run` 与 `--diff`；
- Base UI 组合使用 `render`；Button 充当链接时使用真实 Link 配合 `buttonVariants`，不覆盖链接语义；
- 不直接从 GitHub 抓取组件源码；
- `src/components/ui/` 是 Registry-owned 目录，只允许 `.toolchain/baseline.json` 已登记的 shadcn 组件源码；测试、业务组件、Wrapper、Hook、Helper 和手写新组件必须放到其他目录；
- 不在 Feature 中复制 Button、Badge、Dialog 等基础实现；
- 状态色使用 Badge Variant 或语义 Token；
- Button 内图标遵循组件 `data-icon` 约定，不额外硬编码尺寸；
- Form 使用 `FieldGroup + Field`；
- InputGroup 使用专用子组件；
- 2–7 项 Option Set 优先使用 `ToggleGroup`；
- Empty、Alert、Skeleton、Separator、Sonner 使用官方组件；
- Dialog、Sheet、Drawer 必须包含可访问 Title。

Theme 使用原生 Provider，不引入第二个全局 Store。偏好仅为 `system | light | dark`，默认 `system`，Local Storage Key 为 `aigw_theme`；系统媒体查询、根 Class、`color-scheme` 和 `theme-color` 都是单一偏好的派生输出。Theme 控制使用官方 Base UI `DropdownMenuRadioGroup`，Label 必须位于 Group Context 内。

## 4. 状态管理

- 服务端状态：TanStack Query；
- 控制面 API：只消费 `admin-openapi.json` 生成客户端；
- 路由和可分享筛选：TanStack Router Search Params；
- 表格：TanStack Table；有价值的分页、排序、筛选和选中 ID 同步 URL；
- 长列表：TanStack Virtual；
- 表单草稿：React Hook Form；
- 表单输入校验：Zod；HTTP Request/Response 类型来自 OpenAPI 生成物；
- 只有出现真实跨页面客户端状态时才引入全局 Store。

禁止把服务端对象长期复制到全局 Store，形成 Query Cache 与 Store 双事实来源。

跨页对象入口由目标 Route 拥有的 Search Schema 与 `routes/-deep-links.ts` Builder 定义。Builder 只覆盖真实消费者，省略未设置的默认值，不建立第二份通用路由 Registry；Feature 不自行发明 Search 参数。

## 5. OpenAPI 客户端

控制面客户端闭环：

```text
createRoute
→ static admin-openapi.json
→ openapi-typescript → api/schema.d.ts
→ openapi-fetch（类型安全 Fetch）
→ openapi-react-query（method/path/params → Query Options/Mutation）
→ TanStack Query（唯一服务端状态缓存）
→ 生成物新鲜度检查
```

要求：

- OpenAPI 生成物进入版本控制，但禁止手工修改；
- `src/api/` 只容纳生成物，不放手写 Client、Interceptor、Query Key 或 Feature Wrapper；
- Fetch 认证、Base URL 等运行时配置集中在 `src/lib/api-runtime/`；
- Query Key 由 OpenAPI method/path/params 稳定派生，Feature 禁止手工复制字符串 Key；
- Feature 可以用 `select` 映射控制面 Envelope，但 TanStack Query 仍是唯一服务端状态事实来源；
- CI 在临时目录重生成并逐文件比较；
- 数据面 OpenAI/Anthropic 请求不通过该客户端；
- 控制面 DTO 不得复用为透明代理运行时 DTO。

## 6. 查询与错误

Query Key 必须包含所有影响结果的筛选、分页、排序和 Scope。Mutation 成功后精确失效或更新相关缓存。

错误处理：

- 401/403：控制面 Session 错误，不与上游 Credential 错误混淆；
- 409：配置版本冲突，显示当前版本并允许重新加载；
- 422：字段或配置编译错误，定位具体 Field/Section；
- 5xx/网络：保留用户草稿并提供重试；
- 首次查询失败：显示持久错误和显式重试，不得归一成成功空状态；
- 有缓存的刷新失败：保留最后一次成功数据，在拥有该查询的区域显示非阻断警告；
- 部分失败：按 List、Inspector、详情 Sheet 或其他查询所有权分区呈现，不清空整页；
- `unknown`、无数据、未验证和数值 0 必须分开。

## 7. API View Model

UI 不直接渲染数据库实体或内部 Domain Object。每个 Feature 定义稳定 View Model，例如：

```ts
type RequestResult
  = | { kind: "success" }
    | { kind: "success_with_fallback"; attemptCount: number }
    | { kind: "failed"; errorClass: string };
```

状态映射集中管理，避免页面各自解释 HTTP Code、Attempt 和 Cost 状态而产生不一致文案。只负责显示投影的 View Model 不导入 React、TanStack Query 或浏览器 API，并以 Node 环境单元测试覆盖完整枚举、顺序及 `null`/`0` 边界。

## 8. 表格与虚拟化

- 默认服务端分页；
- 大表格使用 TanStack Virtual，同时保留可访问的表格语义或等价替代；
- 列定义与格式器独立于页面容器；
- URL 承载分页、排序、筛选和选中对象 ID；
- 刷新后可恢复 URL-owned 详情选中状态；
- 列表查询不返回完整 Raw Payload；
- 虚拟化不能破坏键盘导航、焦点恢复和行选择。

## 9. 表单与 Secret

- Secret Input 不回填已有值；
- 编辑时只显示“已配置”、Mask 和替换入口；
- 未提交 Secret 不写入 Local Storage、URL、日志或 Analytics；
- 一次性完整 Key 只在创建/轮换成功状态存在，刷新后不得恢复；
- Clipboard 操作提供成功反馈；
- 浏览器错误日志、Query Cache 和 DevTools Metadata 不得包含完整 Secret。

## 10. 设计 Token

全局 CSS 使用 shadcn 语义变量并补充产品 Token。Feature 代码只使用语义 Class 或变量，不复制原始颜色、Sidebar 宽度或圆角数值。

`components/ui` 是官方 Registry 所有面，不接受手工 Patch 或 Formatter 改写。产品状态组件位于 `components/product`，App Shell 差异通过官方 Sidebar 的 Props 和组合表达。

机器可读值见 [`design-tokens.json`](design-tokens.json)。浏览器实现通过 CSS Custom Properties 消费已落地 Token，`verify:web-contracts` 使用项目 JSON Schema 校验完整结构，并校验页面 Gutter、页面 Padding、Inspector 高度、Theme、响应式断点和 Scenario 关联没有漂移。Token 变化必须同步规范、当前截图和视觉回归证据。

## 11. 测试

至少包括：

- 单元：状态映射、格式化、匹配解释和 Cost Unknown；
- 组件：表格筛选、Inspector 与详情 Sheet 生命周期、Theme Dropdown Menu、Sheet/Dialog Form；
- 集成：连接 → 路由规则 → 客户端 → 测试 Request；
- E2E：核心闭环、键盘、URL 恢复、Error/Partial、局部故障隔离和稳定区域 ARIA 语义；
- 视觉：1440 × 1000、1280 宽、1024 × 768，Light/Dark 分开记录；
- 可访问性：axe 或等价自动检查，加键盘人工检查；
- 浏览器：Chromium 执行主流程与视觉回归，Firefox 执行 Theme、Inspector、详情 Sheet、键盘、Reflow、Overlay 几何与 a11y 目标子集；
- Artifact：对 Vite Build 产物运行浏览器 Golden Journey。

## 12. 禁止实现

- 把所有页面写在一个巨型 `App.tsx`；
- 自定义仿 shadcn 基础组件长期进入生产；
- 原始颜色或布局常量散落在 Feature；
- 用客户端假数据替代真实 Loading/Error/Partial；
- 将高密度表格改成 Card 网格；
- 在路由编辑器加入跨协议转换；
- 把 Unknown Cost 转为 0；
- 在日志、URL、导出或 Query Cache 暴露 Secret；
- 手工修改 OpenAPI 生成客户端；
- 让一个 Feature 直接导入另一个 Feature。
- 用运行时 Registry 或第二份手写路由清单替代文件路由、产品合同与静态 Page Manifest 的明确所有权。
