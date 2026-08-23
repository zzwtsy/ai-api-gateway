---
name: add-control-feature
description: 按仓库黄金路径新增或修改严格的 Hono OpenAPI 控制面 Feature。
---

# 新增控制面 Feature

先读：

1. `apps/gateway/src/control-plane/AGENTS.md`
2. `docs/conventions/http-contracts-and-route-definition.md`
3. 最近的已有 Feature

实现显式垂直切片：

```text
schemas.ts
routes.ts
handlers.ts
service.ts 或 contracts.ts（确有需要时）
index.ts
共置单元测试
```

要求：

- 使用 `createRoute` 和 SDK-friendly、全局唯一的 `operationId`；
- 导出 `typeof route`，Handler 使用 `AppRouteHandler<RouteType>`；
- 数据库 I/O 和长回调不得进入 `routes.ts`；
- 在 `index.ts` 显式绑定 Route 和 Handler；
- 显式注册 Feature，不增加文件系统扫描；
- OpenAPI 的 `summary`、`description` 和 Response Description 使用中文；
- Tag、`operationId`、Schema 名、字段名和 Error Code 使用英文；
- 更新 OpenAPI 合同测试并重新生成 Web Schema；
- 运行 `pnpm check:control`，报告精确结果。
