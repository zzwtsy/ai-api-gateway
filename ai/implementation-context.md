---
status: normative
last_reviewed_at: 2026-08-23
language: zh-CN
---

# 实现上下文

## 1. 固定技术基线

```text
Node.js 24 LTS
TypeScript 6.x（全仓库单版本，strict）
pnpm workspace

Hono + @hono/node-server
Undici Pool / Dispatcher
@hono/zod-openapi + Zod + Scalar
Better Auth
Pino JSON logging

PostgreSQL
Drizzle ORM

React + Vite
shadcn/ui + Tailwind CSS
TanStack Router / Query / Table / Virtual
React Hook Form + Zod
openapi-typescript + openapi-fetch + openapi-react-query
shadcn Chart + Recharts

Vitest + fast-check
Testcontainers
Playwright
Docker Compose
```

禁止 TypeScript 7、`@typescript/native`、`@typescript/typescript6` 或任何双版本方案。

## 2. 初始 Workspace

```text
apps/
├── gateway/             数据面 + 控制面 + 静态 Web 服务
├── web/                 React 控制面
└── e2e/                 Docker/Playwright

packages/
└── protocol-testkit/    只有多个 Workspace 真实消费后才创建
```

不预建 `domain/db/application/infrastructure/providers` 等 Package。物理 Package 需要真实消费者或独立发布边界。

## 3. Gateway 目录

```text
src/
├── index.ts
├── app/
│   ├── create-application.ts
│   ├── dependencies.ts
│   ├── register-control-plane.ts
│   ├── register-data-plane.ts
│   └── lifecycle.ts
├── control-plane/
│   ├── auth/
│   ├── http/
│   └── features/
│       ├── connections/
│       ├── model-bindings/
│       ├── routing-rules/
│       ├── clients/
│       ├── requests/
│       ├── analytics/
│       └── settings/
├── data-plane/
│   ├── ingress/
│   ├── protocols/{openai-chat,openai-responses,anthropic-messages}/
│   ├── routing/
│   ├── credentials/
│   ├── providers/
│   ├── transport/
│   ├── observation/
│   └── recording/
├── catalogs/
├── commands/
├── config/
├── core/{crypto,errors,logging,time}/
└── db/{schema,migrations}/
```

## 4. TypeScript 规则

- `strict: true`；
- `exactOptionalPropertyTypes`；
- `noUncheckedIndexedAccess`；
- `noImplicitOverride`；
- `useUnknownInCatchVariables`；
- `verbatimModuleSyntax`；
- `isolatedDeclarations`；
- 后端 NodeNext；前端 Bundler；
- 外部 JSON 以 `unknown` 进入；
- 数据面完整 Body 使用通用 JSON 类型，不使用不完整 Provider DTO；
- Domain 状态使用 discriminated union，并对闭集使用 `assertNever`；
- 金额使用 PostgreSQL `numeric` + API string，不以 JS `number` 为权威值；
- 时间使用 `timestamptz`，Duration 使用整数毫秒/微秒。

## 5. 控制面 Feature 模式

```text
connections/
├── routes.ts
├── handlers.ts
├── schemas.ts
├── service.ts
├── policies.ts        # optional
├── connections.test.ts
└── index.ts
```

```text
createRoute
→ AppRouteHandler<typeof route>
→ Service
→ OpenAPI
→ generated Web client
```

`routes.ts` 保持接近静态合同，不内联长数据库或审计函数。Feature Router 显式注册，不做文件扫描。

## 6. 数据面 Route 模式

```ts
router.post("/openai/v1/chat/completions", handleOpenAiChatCompletions);
router.post("/openai/v1/responses", handleOpenAiResponses);
router.post("/anthropic/v1/messages", handleAnthropicMessages);
```

- 不使用控制面 Envelope；
- 不用完整 Zod DTO 重建请求；
- 不通过 OpenAPI 生成客户端调用数据面；
- 最小提取 model/stream/允许 Patch；
- 其他未知字段保留。

## 7. HTTP Transport

数据面使用按 origin 缓存的有限 Undici Pool。必须支持：

- AbortSignal；
- connect/headers/chunk-idle timeout；
- 有限 connections；
- 受控 Redirect；
- 原始响应 Header；
- 可配置 TLS/Proxy；
- 不隐式重试。

Credential 与 Connection Pool 分离：多个 Key 共享相同 origin Pool。

## 8. Bounded Observer Tap

```ts
interface ObserverTap {
  tryWrite: (chunk: Uint8Array) => boolean;
  end: (outcome: StreamOutcome) => Promise<StreamObservation>;
  abort: (reason: unknown) => Promise<void>;
}
```

- 主路径 await downstream write；
- Tap 只 try-enqueue；
- Queue 满返回 false 并标记 observation incomplete；
- 禁止 `Response.clone()` / `ReadableStream.tee()`；
- Observer 不返回要写给客户端的事件。

## 9. Route Resolver

```text
resolveRoute(context, snapshot): RouteResolution
```

纯函数，不访问数据库、网络或全局时间。Credential Scheduler 接受 `now` 和状态快照。

控制面发布：

```text
DB commit
→ compile immutable snapshot
→ validate
→ atomic publish
```

## 10. Secret API

```ts
interface SecretCipher {
  encrypt: (plaintext: Uint8Array, context: SecretContext) => Promise<EncryptedSecret>;
  decrypt: (secret: EncryptedSecret, context: SecretContext) => Promise<Uint8Array>;
}
```

Gateway Client Key 只保存哈希/HMAC；Provider Credential 保存加密密文。完整值仅创建/轮换时显示一次。

## 11. PayloadStore

```ts
interface PayloadStore {
  put: (input: AsyncIterable<Uint8Array>, options: PutPayloadOptions) => Promise<PayloadRef>;
  get: (ref: PayloadRef) => Promise<ReadableStream<Uint8Array>>;
  delete: (ref: PayloadRef) => Promise<void>;
}
```

首版使用本地私有目录；PostgreSQL 保存索引、哈希、长度、截断和保留信息。

## 12. 数据库事务

需要短事务：

- Account + Credential + EndpointCredential；
- Route + Targets + Patches；
- Routing Snapshot 发布元数据；
- 完成 Attempt + Usage + PricingSnapshot + Request 汇总；
- Key 轮换。

流式 Request 不持有长事务。

## 13. 构建

```text
Backend: tsc -b → plain Node ESM
Frontend: Vite build
Artifact: Docker image
```

开发可使用 `tsx`，但 Artifact Gate 必须运行 plain Node 和 Docker。

## 14. 工程入口

- 架构与技术：`docs/architecture/engineering-foundation.md`
- Route：`docs/conventions/http-contracts-and-route-definition.md`
- 目录边界：`docs/architecture/repository-layout-and-dependency-boundaries.md`
- Vibecoding：`docs/conventions/vibecoding-and-agent-governance.md`
- Quality Gate：`docs/conventions/quality-gates-and-evidence.md`
- 当前实现：`docs/architecture/current-implementation.md`
