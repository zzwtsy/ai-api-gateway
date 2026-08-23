---
document_id: AIGW-API-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 控制面 API 设计

## 1. API 风格

- Base Path：`/admin/api/v1`；
- JSON；
- 使用稳定资源名；
- 写操作使用乐观并发版本或 `If-Match`；
- 所有响应包含 `requestId`；
- 错误使用统一 Gateway Admin Error；
- 列表使用游标或页码分页；
- 时间使用 RFC 3339 UTC；
- Secret 创建端点与普通更新端点分开。

完整轮廓见 [api/openapi-outline.yaml](../references/openapi-outline.yaml)。控制面 HTTP 契约的代码组织、`createRoute`、Handler 类型、静态 OpenAPI 导出和生成客户端闭环见 [HTTP 契约与路由定义](http-contracts-and-route-definition.md)。

## 1.1 契约事实来源

控制面使用：

```text
createRoute
→ AppRouteHandler<typeof route>
→ Service
→ OpenAPI Document
→ Generated Web Client
```

每个 Feature 显式维护 `routes.ts`、`handlers.ts`、`schemas.ts`、`service.ts` 和 `index.ts`。禁止使用隐藏 method/path/operationId/error code 的 CRUD DSL。

`createApplication()` 必须可在不启动 Server、Timer 和数据库连接的情况下静态生成 OpenAPI。CI 在临时目录重新生成前端 OpenAPI 类型并与提交产物比较。

## 1.2 与数据面的边界

本文件只约束 `/admin/api/v1` 控制面。OpenAI Chat、OpenAI Responses 和 Anthropic Messages 入口不使用控制面统一 Envelope，也不以不完整 OpenAPI DTO 重建请求。数据面合同见 [协议代理](../architecture/data-plane-protocol-proxy.md) 和 [HTTP 契约与路由定义](http-contracts-and-route-definition.md)。

## 2. 通用成功 Envelope

```json
{
  "data": {},
  "requestId": "adm_..."
}
```

列表：

```json
{
  "data": [],
  "page": {
    "cursor": null,
    "nextCursor": "...",
    "hasMore": true
  },
  "requestId": "adm_..."
}
```

## 3. 通用错误

```json
{
  "error": {
    "code": "route_protocol_mismatch",
    "message": "Responses route cannot target a Chat Completions endpoint.",
    "details": {
      "routeId": "...",
      "endpointId": "..."
    }
  },
  "requestId": "adm_..."
}
```

## 4. Provider 与连接

```text
GET    /providers
POST   /providers
GET    /providers/{providerId}
PATCH  /providers/{providerId}
DELETE /providers/{providerId}

GET    /providers/{providerId}/endpoints
POST   /providers/{providerId}/endpoints
PATCH  /endpoints/{endpointId}
POST   /endpoints/{endpointId}/probe
POST   /endpoints/{endpointId}/discover-models

GET    /providers/{providerId}/accounts
POST   /providers/{providerId}/accounts
PATCH  /accounts/{accountId}

POST   /accounts/{accountId}/credentials
POST   /credentials/{credentialId}/probe
POST   /credentials/{credentialId}/disable
POST   /credentials/{credentialId}/enable
POST   /credentials/{credentialId}/clear-cooldown
DELETE /credentials/{credentialId}
```

Secret 创建响应只返回 Mask，不返回输入 Secret。

## 5. 模型

```text
GET    /models
GET    /models/{bindingId}
POST   /endpoints/{endpointId}/models
PATCH  /models/{bindingId}
POST   /models/{bindingId}/match-models-dev
POST   /models/{bindingId}/overrides
DELETE /models/{bindingId}/overrides/{field}

GET    /models-dev/status
POST   /models-dev/sync
GET    /models-dev/changes
POST   /models-dev/changes/{changeId}/apply
POST   /models-dev/changes/{changeId}/ignore
```

## 6. 路由

```text
GET    /routes
POST   /routes
GET    /routes/{routeId}
PUT    /routes/{routeId}
DELETE /routes/{routeId}
POST   /routes/{routeId}/enable
POST   /routes/{routeId}/disable
POST   /routes/{routeId}/validate
POST   /routes/explain
POST   /routes/publish
GET    /routes/snapshot
```

`POST /routes/explain` 必须调用与数据面相同的 Route Resolver：

```json
{
  "clientId": "...",
  "protocol": "openai_responses",
  "model": "gpt-5.4"
}
```

返回匹配和被拒绝候选。

## 7. 客户端

```text
GET    /clients
POST   /clients
GET    /clients/{clientId}
PATCH  /clients/{clientId}
POST   /clients/{clientId}/keys
POST   /client-keys/{keyId}/revoke
POST   /client-keys/{keyId}/set-expiry
GET    /clients/{clientId}/configuration
POST   /clients/{clientId}/test
```

创建 Key 时：

```json
{
  "data": {
    "keyId": "...",
    "secret": "gw_codex_...",
    "prefix": "gw_codex",
    "last4": "7A42"
  }
}
```

仅此响应返回 `secret`。

## 8. 请求和 Attempt

```text
GET /requests
GET /requests/{requestId}
GET /requests/{requestId}/attempts
GET /requests/{requestId}/timeline
GET /requests/{requestId}/raw-request
GET /requests/{requestId}/raw-response
POST /requests/{requestId}/redact
DELETE /requests/{requestId}/payload
```

列表筛选：

```text
from/to
clientId
harnessProfile
providerId
endpointId
accountId
model
requestedModel
protocol
status
errorCategory
hasFallback
requestId
```

## 9. Analytics

```text
GET /analytics/summary
GET /analytics/timeseries
GET /analytics/breakdown
GET /analytics/errors
GET /analytics/costs
```

请求参数：

```text
metric=request_count|tokens|cost|error_rate|ttft|latency|fallback_rate
groupBy=client|harness|provider|endpoint|account|model|protocol
interval=hour|day|week
```

错误率 API 必须返回口径名称，不能只返回数字：

```json
{
  "metric": "request_error_rate",
  "numerator": 12,
  "denominator": 1000,
  "value": 0.012
}
```

## 10. 设置

```text
GET   /settings
PATCH /settings/logging
PATCH /settings/security
PATCH /settings/pricing
PATCH /settings/retention
POST  /settings/backup/export
POST  /settings/backup/import/validate
POST  /settings/backup/import/apply
```

导出含 Secret 必须使用独立端点和二次确认 Token。

## 11. 乐观并发

Route、Endpoint、Model Override 等复杂资源带 `version`：

```json
{
  "id": "...",
  "version": 7
}
```

更新提交 `If-Match: "7"` 或 Body version。冲突返回 409，UI 显示“配置已被其他操作更新”。即使单用户，也可能有多个浏览器标签和后台同步任务。

## 12. 幂等性

Secret 创建、Route 发布、Probe 等可能重复调用的写操作支持：

```text
Idempotency-Key
```

至少保证创建 Gateway Client Key 时不会因网络重试生成多个未知 Key。

## 13. 安全

- Admin API 仅 Session Auth；
- Ingress API Key 不能调用 Admin API；
- CSRF 防护；
- Content-Type 校验；
- 分页上限；
- Raw Payload 响应 `Cache-Control: no-store`；
- Secret 创建响应 `Cache-Control: no-store`；
- 审计所有高风险写操作。

## 14. API 验收条件

- OpenAPI 3.1 文档可静态导出并解析；
- 每个 Operation 有唯一、SDK-friendly `operationId`、tag、description 和 2xx response；
- 错误状态绑定稳定 Error Code Example；
- 生成前端 OpenAPI 类型与 OpenAPI 无漂移；
- 所有写操作有错误码；
- 路由 Explain 与运行时一致；
- Secret 只在创建时返回；
- 错误率返回 numerator/denominator；
- 列表筛选可由 URL 恢复；
- 乐观并发冲突返回 409；
- Raw Payload 不被浏览器缓存。
