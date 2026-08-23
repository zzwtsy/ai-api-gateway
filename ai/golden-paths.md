---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 黄金路径（Golden Paths）

后续 Feature 必须优先复制这两条经过验证的路径。

## 控制面黄金路径

```text
connections/routes.ts
→ connections/handlers.ts
→ connections/service.ts
→ Drizzle schema/migration
→ createApplication()
→ admin-openapi.json
→ generated web client
→ Connections UI
→ contract + integration + browser e2e
```

必须证明：

- Route/Handler 类型关联；
- `operationId` 唯一；
- Validation/Error Envelope；
- OpenAPI 静态导出；
- Generated API Types Freshness；
- Feature Boundary；
- Secret 字段不回填。

## 数据面黄金路径

```text
OpenAI Chat ingress
→ Gateway Client Key
→ immutable RoutingSnapshot
→ Credential Scheduler
→ Undici Mock Provider
→ raw SSE downstream
→ bounded Observer Tap
→ Request/Attempt persistence
→ Request Inspector
```

必须证明：

- 未知字段保留；
- 原始字节一致；
- Abort/Backpressure；
- Observer 满载降级；
- 首字节后不回退；
- Request 1:N Attempt；
- Snapshot Version/Route/Credential 可解释；
- Keyless Snapshot 同时比较 Provider 实收、Client 实收和 Request/Attempt；
- plain Node、编译产物浏览器和 Docker 路径可运行。

## 使用规则

新增 Feature 前先搜索相邻 Golden Path 的代码、测试、文档和 Decision Note。只有真实差异需要新模式；不得根据通用经验平行创建另一套结构。
