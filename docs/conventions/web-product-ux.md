---
status: active
last_reviewed_at: 2026-08-25
language: zh-CN
---

# Web 产品 UX 约定

控制面采用克制的 shadcn Product UX：中性表面、表格优先、有限语义色、低视觉噪声，不把适合表格的数据改造成卡片网格。

## 产品目标与交付状态

`docs/product/ux/page-contracts.json` 拥有产品目标页面全集；`apps/web/src/routes/-page-manifest.ts` 拥有已交付导航页面。生成路由和当前源码共同决定实际可访问页面。Convention 不复制页面库存，完整产品合同见 [前端产品 UX 规范](../product/ux/README.md)。

## 交互容器与视线重心

为避免在 1440px 桌面大屏下产生右侧视觉拉扯与遮罩疲劳，界面严格执行分层容器原则：

- **Dialog（居中模态）**：承载添加客户端、添加 Endpoint、添加账号、密钥轮换、一次性 Secret 展示等高聚焦、短生命周期任务；
- **Master–Detail（双栏工作台）**：承载请求排障、连接检视、模型与客户端详情等高频数据比对与深度排障，无遮罩伴随查阅；Clients/Models 在 1440px 并排，在 1280px 与 1024px 按 Master、Inspector 顺序上下排列，Inspector Header 固定且 Body 在内容视口内滚动；
- **Sheet（侧滑抽屉）**：仅作为辅助性工具（如复杂全局筛选器、只读 Raw Payload 报文检查），禁止作为主创建表单或在单抽屉内嵌套多步骤业务状态；
- **独立页面**：承载多分区复杂编排（如路由编辑器）。

## 状态与结构

- 服务端状态由 TanStack Query 管理；
- 可分享筛选和选中 ID 放入 Router Search Params；
- 表单使用 React Hook Form + Zod；
- 页面负责组合 Feature，Feature 不直接依赖另一个 Feature；
- 完整 Key 不进入 Local Storage、Session Storage、URL 或 Analytics；
- 未知费用、Usage 和兼容性使用明确状态，不能显示为零或正常；
- 中文是默认界面语言，术语按 [语言与本地化](language-and-localization.md) 处理。

## Theme

- 偏好只有 `system | light | dark`，默认 `system`，由根 Theme Provider 独占；
- Topbar 使用官方 shadcn/Base UI Dropdown Menu 切换主题；
- `aigw_theme` 只保存非敏感枚举值，系统主题变化和同源标签页同步必须派生到根 Class、`color-scheme` 与 `theme-color`；
- Light/Dark 只通过语义 Token 实现，Feature 不维护散落的原始颜色分支；
- `prefers-reduced-motion` 下禁用非必要动画。
