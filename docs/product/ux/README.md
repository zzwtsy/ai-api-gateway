---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# AI API Gateway 前端设计规范

> 状态：现行规范  
> 适用范围：个人自托管、单用户、桌面 Web 控制面  
> 视觉方向：shadcn Product UX，克制、表格优先、可解释、低噪声  
> 最低承诺视口：1280px；基准视口：1440 × 1000

本目录是前端设计的**唯一现行事实来源**。页面结构、视觉 Token、组件选择、状态模型、交互方式和验收标准均在这里定义。实现不得再引用其他历史 UI 文档或历史视觉稿。

## 规范优先级

发生冲突时按以下顺序处理：

1. 产品不可破坏约束；
2. 本目录的逐页行为规范；
3. `design-tokens.json` 与组件契约；
4. `assets/` 中的重构后截图；
5. 交互原型源码。

截图用于锁定布局、密度、层级和视觉关系；文字规范用于锁定行为、状态与数据语义。不得用截图中的演示数值推导真实业务默认值。

## 阅读顺序

1. [产品 UX 合同](00-product-ux-contract.md)
2. [信息架构](01-information-architecture.md)
3. [App Shell 与视觉系统](02-app-shell-and-visual-system.md)
4. [组件与交互契约](03-component-and-interaction-contract.md)
5. [概览](04-overview.md)
6. [请求排障](05-requests.md)
7. [分析](06-analytics.md)
8. [连接](07-connections.md)
9. [模型](08-models.md)
10. [路由](09-routes.md)
11. [客户端](10-clients.md)
12. [设置](11-settings.md)
13. [首次设置与跨页流程](12-onboarding-and-cross-page-flows.md)
14. [响应式、可访问性与内容语言](13-responsive-accessibility-and-content.md)
15. [前端实现契约](14-implementation-contract.md)
16. [验收清单](15-acceptance-checklist.md)

机器可读契约：

- [`design-tokens.json`](design-tokens.json)
- [`page-contracts.json`](page-contracts.json)

运行 `pnpm docs:bundle` 可从本目录生成前端单文件规范；生成物位于 `.artifacts/spec/`，不得手工单独维护。
