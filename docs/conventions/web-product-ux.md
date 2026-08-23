---
status: active
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Web 产品 UX 约定

控制面采用克制的 shadcn Product UX：中性表面、表格优先、有限语义色、低视觉噪声，不把适合表格的数据改造成卡片网格。

## 当前实现页面

- 概览：展示逻辑请求指标、最近请求和当前架构链路；
- 连接：验证控制面列表/创建和 OpenAPI 客户端；
- 请求：验证 `Request` 与 `Attempt` 的 Master–Detail 排障工作台；
- 登录：生产环境 Better Auth Session，开发环境受限控制面令牌。

## 状态与结构

- 服务端状态由 TanStack Query 管理；
- 可分享筛选和选中 ID 放入 Router Search Params；
- 表单使用 React Hook Form + Zod；
- 页面负责组合 Feature，Feature 不直接依赖另一个 Feature；
- 完整 Key 不进入 Local Storage、Session Storage、URL 或 Analytics；
- 未知费用、Usage 和兼容性使用明确状态，不能显示为零或正常；
- 中文是默认界面语言，术语按 [语言与本地化](language-and-localization.md) 处理。

完整页面合同见 [前端产品 UX 规范](../product/ux/README.md)。
