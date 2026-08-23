---
document_id: AIGW-ENG-ROUTES-001
status: normative
last_reviewed_at: 2026-08-23
language: zh-CN
---

# HTTP 契约与路由定义

## 1. 先消除 `route` 术语冲突

本项目同时存在三种不同概念：

| 名称 | 含义 | 推荐代码命名 |
| --- | --- | --- |
| HTTP Route | Hono 的 method + path + handler | `createConnectionRoute` |
| Routing Rule | 产品中决定请求去向的规则 | `RouteRule`，Feature 目录使用 `routing-rules/` |
| Frontend Route | TanStack Router 页面路由 | `routes/` |

后端产品 Feature 禁止仅命名为 `routes/`，否则 AI Agent 容易把 HTTP Route 与 RouteRule 混用。

## 2. 控制面使用显式 OpenAPI Route

控制面每个中型 Feature 默认结构：

```text
control-plane/features/connections/
├── routes.ts
├── handlers.ts
├── schemas.ts
├── service.ts
├── policies.ts          # 可选：认证外的 route-specific policy/audit
├── errors.ts            # 可选：Feature Error Code 声明
├── connections.test.ts
└── index.ts
```

职责：

```text
routes.ts    HTTP 方法、路径、OpenAPI、Schema、响应、route middleware
handlers.ts  读取已校验输入和请求上下文，调用 service，返回统一响应
schemas.ts   控制面公开 Request/Response Schema
service.ts   业务规则、事务和数据库操作
policies.ts  审计、幂等、资源快照等与具体 Route 强关联的策略
index.ts     显式绑定 route 与 handler，对外暴露 Feature Router
```

## 3. Route 定义规范

每个控制面业务 Route 必须显式声明：

```ts
createRoute({
  method,
  path,
  tags,
  operationId,
  summary,
  description,
  middleware,
  security,
  request,
  responses,
});
```

`operationId`：

- lowerCamelCase；
- 全局唯一；
- 动词优先；
- 以未来生成 SDK 的方法名为目标；
- 不使用 `Feature_Action` 枚举风格。

推荐：

```text
listConnections
getConnectionById
createConnection
updateConnection
probeCredential
publishRoutingSnapshot
explainRoutingDecision
```

## 4. 控制面示例

```ts
// routes.ts
import { createRoute } from "@hono/zod-openapi";

import {
  controlAuthErrorResponses,
  controlSessionSecurity,
  jsonErrorResponse,
  jsonSuccessResponse,
} from "@/control-plane/http/openapi/index.js";
import { requireControlSession } from "@/control-plane/auth/require-control-session.js";

import {
  ConnectionSchema,
  CreateConnectionBodySchema,
} from "./schemas.js";

export const createConnectionRoute = createRoute({
  method: "post",
  path: "/connections",
  tags: ["Connections"],
  operationId: "createConnection",
  summary: "创建连接",
  description: "创建一个上游 Provider Endpoint。协议类型创建后不可隐式转换。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateConnectionBodySchema,
        },
      },
    },
  },
  responses: {
    201: jsonSuccessResponse(ConnectionSchema, "连接已创建"),
    ...controlAuthErrorResponses,
    409: jsonErrorResponse("连接名称或 Endpoint 已存在", "CONNECTION_CONFLICT"),
  },
});

export type CreateConnectionRoute = typeof createConnectionRoute;
```

```ts
// handlers.ts
import type { AppRouteHandler } from "@/control-plane/http/context.js";
import type { CreateConnectionRoute } from "./routes.js";

import { successResponse } from "@/control-plane/http/response.js";
import { ConnectionService } from "./service.js";

export const createConnectionHandler: AppRouteHandler<CreateConnectionRoute> = async (c) => {
  const input = c.req.valid("json");
  const connection = await ConnectionService.create(input);

  return successResponse(c, connection, { status: 201 });
};
```

```ts
// index.ts
import { createControlRouter } from "@/control-plane/http/create-router.js";

import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

export default createControlRouter()
  .openapi(routes.createConnectionRoute, handlers.createConnectionHandler);
```

## 5. 显式优于 CRUD DSL

禁止使用隐藏完整 HTTP 契约的通用 CRUD DSL：

```ts
// 禁止作为主要 Route 定义方式
createCrudFeature({ entity: "connection" });
```

允许小型 Helper：

- `jsonSuccessResponse()`；
- `jsonErrorResponse()`；
- `controlAuthErrorResponses`；
- 分页 Schema；
- 标准 Security Scheme；
- 通用 Validation Hook。

Helper 不能隐藏：

- Method / Path；
- `operationId`；
- 业务 Error Code；
- 认证与幂等策略；
- 公开 Request / Response Schema。

## 6. Route 对象保持接近静态契约

`routes.ts` 不应内联长异步函数、数据库读取或复杂审计逻辑。错误示例：

```ts
middleware: [audit({
  before: async () => databaseQuery(),
  after: async () => parseLargeResponse(),
})]
```

推荐：

```ts
middleware: updateConnectionPolicies
```

复杂策略在 `policies.ts` 实现并单独测试，使 `routes.ts` 仍可被快速阅读为 HTTP 合同。

## 7. Handler 保持薄

Handler 只做：

1. 读取 `c.req.valid()`；
2. 读取经过认证的 Control Context；
3. 调用一个明确 Service Use Case；
4. 返回统一 Envelope。

Handler 不做：

- 拼接 SQL；
- 手动重新校验 Zod 已验证的数据；
- 复制业务错误映射；
- 直接操作 Routing Snapshot 全局引用；
- 编排多个长期运行后台任务。

## 8. Service 分层按复杂度演进

初期采用实用垂直切片：

- 简单 Feature 可以没有 Service；
- 中型 Feature 的 Service 可以直接访问 Drizzle；
- 事务由拥有业务原子性的 Service 控制；
- 不预建 Repository Interface；
- 只有出现多个持久化实现、复杂领域模型或多个消费者时才增加 Repository/Port。

这避免 AI 为每个表生成无意义的 Controller/UseCase/Repository/Mapper 四层模板。

## 9. 控制面统一 Validation 与错误

`createControlRouter()` 必须配置全局 Validation Hook：

- Zod 校验失败统一映射到稳定错误码；
- 记录字段级错误与 `requestId`；
- Handler 只处理合法输入；
- 未暴露的内部错误不得返回 `details`；
- 401/403 是控制面认证错误，不与 Provider Credential 401/403 混淆。

控制面响应 Envelope 由 Zod Schema 派生，运行时与 OpenAPI 不维护两份类型。

## 10. OpenAPI 生成闭环

```text
createRoute source
→ createApplication()（无 server/db/timer 副作用）
→ app.getOpenAPIDocument()
→ admin-openapi.json
→ OpenAPI lint/validate
→ generated frontend OpenAPI types
→ freshness diff
```

必须具备：

- `openapi:export`：不启动 Server、不连接数据库即可生成；
- `openapi:contract`：检查 operationId 唯一、tags、description、2xx、Error Example；
- `api:generate`：生成前端 OpenAPI TypeScript 类型；
- `api:generated:check`：在临时目录重生成并与提交产物比较；
- CI 中禁止“API 已变但客户端未更新”。

前端控制面固定采用 `openapi-typescript + openapi-fetch + openapi-react-query`：OpenAPI 只生成类型，`openapi-fetch` 负责类型安全传输，`openapi-react-query` 将 method/path/params 映射为 TanStack Query Key；不再维护第二套手写 API Wrapper 或请求缓存。

## 11. 数据面不使用控制面 Route 模式

数据面入口：

```text
POST /openai/v1/chat/completions
POST /openai/v1/responses
POST /anthropic/v1/messages
```

使用普通 Hono Route 或专用 Data Plane Router：

```ts
router.post("/openai/v1/chat/completions", handleOpenAiChatCompletions);
router.post("/openai/v1/responses", handleOpenAiResponses);
router.post("/anthropic/v1/messages", handleAnthropicMessages);
```

数据面禁止：

- 使用不完整 Zod Object 解析并重新序列化整个请求；
- 返回控制面统一 Envelope；
- 让 OpenAPI 生成的 DTO 成为透明代理运行时模型；
- 使用全局控制面 Body Limit 覆盖所有协议请求；
- 使用统一审计中间件 Clone 完整响应流。

数据面只最小提取：

```text
model
stream
Gateway 明确负责的 Patch 字段
必要的 Harness Profile 信号
```

其余未知 JSON 字段必须保留。

## 12. 两份 API 文档

### 12.1 `admin-openapi.json`

严格、完整、用于：

- Web 客户端生成；
- Scalar；
- 自动化管理脚本；
- 控制面契约测试。

### 12.2 `gateway-openapi.json`

可选、宽松、只用于说明：

- 路径；
- 认证；
- 支持的入口协议；
- Gateway 自有错误；
- 透明转发边界。

它不得声称完整拥有 OpenAI 或 Anthropic 的所有请求 DTO，也不得生成控制面 Web 客户端。

## 13. Application Composition

```ts
export function createApplication(deps: ApplicationDependencies) {
  const app = createRootApp();

  app.route("/admin/api/v1", createControlPlaneApplication(deps));
  app.route("/", createDataPlaneApplication(deps));
  configureDocumentation(app);

  return app;
}
```

`createApplication()`：

- 不监听端口；
- 不创建 Timer；
- 不注册 `SIGINT` / `SIGTERM`；
- 不隐式连接数据库；
- 可被 Contract Test 安全导入。

资源创建、Server、后台任务和 Graceful Shutdown 归 `lifecycle.ts`。

## 14. Route 契约验收

- 所有控制面 Operation 有唯一、SDK-friendly `operationId`；
- 所有公开 Schema 字段有 description，关键字段有 example；
- 每个错误状态绑定具体 Error Code Example；
- 全局 Validation Hook 与运行时 Error Envelope 一致；
- Route 与 Handler 类型直接关联；
- OpenAPI 可在无数据库环境静态导出；
- 生成客户端无漂移；
- 数据面未导入控制面 Route Schema；
- 数据面未知字段、字节流和错误语义通过协议 Fixture 验证。
