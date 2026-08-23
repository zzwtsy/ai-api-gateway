---
document_id: AIGW-ENG-REPO-001
status: normative
last_reviewed_at: 2026-08-23
language: zh-CN
---

# 仓库结构与依赖边界

## 1. 初始仓库结构

```text
.
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.ts
├── lefthook.yml
│
├── apps/
│   ├── gateway/
│   │   ├── AGENTS.md
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── app/
│   │       │   ├── create-application.ts
│   │       │   ├── dependencies.ts
│   │       │   ├── register-control-plane.ts
│   │       │   ├── register-data-plane.ts
│   │       │   └── lifecycle.ts
│   │       ├── control-plane/
│   │       │   ├── AGENTS.md
│   │       │   ├── auth/
│   │       │   ├── http/
│   │       │   └── features/
│   │       │       ├── connections/
│   │       │       ├── model-bindings/
│   │       │       ├── routing-rules/
│   │       │       ├── clients/
│   │       │       ├── requests/
│   │       │       ├── analytics/
│   │       │       └── settings/
│   │       ├── data-plane/
│   │       │   ├── AGENTS.md
│   │       │   ├── ingress/
│   │       │   ├── protocols/
│   │       │   │   ├── openai-chat/
│   │       │   │   ├── openai-responses/
│   │       │   │   └── anthropic-messages/
│   │       │   ├── routing/
│   │       │   ├── credentials/
│   │       │   ├── providers/
│   │       │   ├── transport/
│   │       │   ├── observation/
│   │       │   └── recording/
│   │       ├── catalogs/
│   │       ├── commands/
│   │       ├── config/
│   │       ├── core/
│   │       │   ├── crypto/
│   │       │   ├── errors/
│   │       │   ├── logging/
│   │       │   └── time/
│   │       └── db/
│   │           ├── client.ts
│   │           ├── migrations/
│   │           ├── schema/
│   │           └── run-migrations.ts
│   │
│   ├── web/
│   │   ├── AGENTS.md
│   │   └── src/
│   │       ├── routes/             # 文件路由 / 页面装配
│   │       ├── features/           # 垂直业务切片
│   │       ├── components/ui/      # shadcn Registry-owned
│   │       ├── components/layout/
│   │       ├── components/product/
│   │       ├── api/                # OpenAPI 生成物 only
│   │       ├── lib/api-runtime/
│   │       ├── test/shadcn/
│   │       ├── app.tsx
│   │       ├── router.tsx
│   │       └── routeTree.gen.ts    # Router Plugin 生成
│   │
│   └── e2e/
│       ├── AGENTS.md
│       └── tests/
│
├── packages/
│   └── protocol-testkit/       # 只有 Gateway 与 E2E 都需要时才创建
│
├── fixtures/
│   ├── protocols/
│   ├── routing/
│   └── providers/
│
├── docs/
│   ├── README.md
│   ├── architecture/
│   ├── conventions/
│   ├── decisions/
│   │   ├── proposed/
│   │   ├── implemented/
│   │   └── rejected/
│   ├── features/
│   ├── runbooks/
│   └── checklists/
│
├── ai/
│   ├── AGENTS.md
│   ├── coding-invariants.md
│   ├── golden-paths.md
│   └── change-evidence-matrix.md
│
└── scripts/
    ├── check.ts
    ├── change-scope.ts
    ├── openapi/
    └── verify/
```

## 2. 不预建无消费者 Package

初期只保留三个 App Workspace。新增 `packages/*` 必须满足至少一个条件：

- 被两个及以上 Workspace 真实消费；
- 需要独立构建或发布；
- 拥有不同于 App 的运行时环境；
- 为测试 Fixture 提供跨 App 的稳定 API。

禁止为了“看起来架构完整”预建：

```text
packages/domain
packages/application
packages/infrastructure
packages/providers
packages/routing
packages/observability
```

物理 Package 是依赖和发布边界，不是文件分类工具。

## 3. Gateway 顶层职责

### `src/app`

唯一 Composition Root：

- 创建并连接具体依赖；
- 挂载数据面和控制面；
- 注册 Catalog Adapter；
- 管理 Server、Scheduler、Pool 和 Shutdown；
- 不承载业务规则。

### `src/control-plane`

- Admin Session；
- OpenAPI Route；
- 配置 CRUD；
- Snapshot 编译与发布；
- Request/Attempt 查询；
- Analytics 查询；
- 不处理 AI 协议透明流。

### `src/data-plane`

- Gateway Client Key；
- 协议入口；
- 路由解析；
- Credential 调度；
- Undici Transport；
- Observer Tap；
- Request/Attempt 运行时记录；
- 不依赖控制面 HTTP Feature。

### `src/core`

只放跨业务基础设施：

- Secret Cipher；
- Error 基础类型；
- Logging；
- Clock；
- 通用受限工具。

`core` 不得成为随意堆放共享代码的目录。

### `src/db`

只放：

- Drizzle Client；
- Schema；
- Migration；
- Migration Runner。

Seed、Bootstrap、备份恢复等跨业务编排放入 `commands/`。

## 4. 依赖方向

```text
app/composition
  ├── control-plane
  ├── data-plane
  ├── catalogs
  ├── commands
  ├── core
  └── db

control-plane feature
  ├── control-plane/http/auth
  ├── core
  └── db

data-plane
  ├── core
  └── db 的窄 Port / Recorder Adapter

core
  └── config/core only

db
  ├── config
  └── core 基础类型
```

硬约束：

1. `data-plane` 不得导入 `control-plane`；
2. `control-plane` 不得导入数据面内部实现，只能调用公开 Snapshot Publisher/Query Port；
3. `core` 不得导入任何具体 Feature；
4. 一个 Control Feature 不得直接导入另一个 Control Feature；
5. 跨 Feature 协作通过 Application Composition、Core Port 或 Catalog；
6. Protocol Adapter 不得直接执行任意控制面数据库查询；
7. Web Feature 不得直接导入另一个 Web Feature；页面 Route 负责组合；
8. `components/ui` 是 shadcn Registry-owned 源码区，只允许基线登记的组件文件；测试、业务组件、Wrapper、Hook、Helper 和手写新组件不得进入该目录；
9. Web 路由固定使用 TanStack Router 文件路由；`routeTree.gen.ts` 是生成物，禁止手工维护；
10. `src/api/` 只容纳 OpenAPI 生成物；请求运行时归 `lib/api-runtime`，服务端状态统一归 TanStack Query。

## 5. 使用 ESLint 执行边界

必须使用 `eslint-plugin-boundaries` 或同等静态门禁，把上述规则写成 CI 可执行配置。

建议 Element：

```text
gateway-application
gateway-control-plane
gateway-data-plane
gateway-core
gateway-db
gateway-config
web-routes
web-features
web-components
web-api
```

默认策略是 `disallow`，只显式允许合法依赖。仅写文档但没有静态约束不算完成。

Feature 内部统一使用相对路径，禁止通过 `@/control-plane/features/*` 绕过 Feature 隔离。

## 6. 复杂度棘轮

初期建议：

```text
cyclomatic complexity <= 15
production file <= 350 lines
function <= 150 lines（忽略注释）
```

它们是阻止继续膨胀的棘轮，不是鼓励机械拆文件的目标。出现例外时必须：

- 写局部、窄范围禁用；
- 说明为什么拆分会破坏可读性或协议顺序；
- 不全局提高阈值掩盖单点问题。

## 7. 显式注册，不做文件扫描魔法

控制面 Feature 由一个稳定文件显式注册：

```ts
export function registerControlPlaneRoutes(app: ControlApp): void {
  app.route("/admin/api/v1", connectionsRouter);
  app.route("/admin/api/v1", modelBindingsRouter);
  app.route("/admin/api/v1", routingRulesRouter);
  app.route("/admin/api/v1", clientsRouter);
  app.route("/admin/api/v1", requestsRouter);
  app.route("/admin/api/v1", analyticsRouter);
  app.route("/admin/api/v1", settingsRouter);
}
```

显式注册优先于自动扫描：

- Diff 可见；
- 注册顺序确定；
- Tree Shaking/打包行为可理解；
- AI 不会创建文件后误以为系统自动加载；
- Contract Test 可以验证所有 Route 已挂载。

## 8. 生命周期与依赖注入

```ts
export interface ApplicationDependencies {
  readonly db: Database;
  readonly routingSnapshots: RoutingSnapshotStore;
  readonly transportRegistry: TransportRegistry;
  readonly payloadStore: PayloadStore;
  readonly secretCipher: SecretCipher;
  readonly clock: Clock;
  readonly logger: Logger;
}
```

禁止模块 import 时：

- 连接数据库；
- 创建 Undici Pool；
- 注册进程 Signal；
- 启动 Timer；
- 读取和解密全部 Secret；
- 发布默认 Snapshot。

`lifecycle.ts` 的关闭顺序：

```text
停止接收新请求
→ 等待 in-flight 或达到 drain deadline
→ 停止 Observer/Recorder 接收新任务
→ drain 持久化队列
→ 停止 Scheduler
→ 关闭 Undici Pool
→ 关闭 PostgreSQL Pool
```

Dispose 必须等待资源真正静止，而不只是发出 Abort。

## 9. 两条 Golden Path

### 9.1 Control Plane Golden Path

```text
Connection createRoute
→ typed handler
→ service + transaction
→ OpenAPI export
→ generated web client
→ Connection UI
→ Contract + E2E
```

### 9.2 Data Plane Golden Path

```text
OpenAI Chat request
→ Gateway Client Key
→ RoutingSnapshot
→ Credential selector
→ Mock Provider
→ raw SSE passthrough
→ bounded Observer Tap
→ Request / Attempt persistence
→ Request Inspector
```

所有新 Feature 优先复制 Golden Path 的公开模式，而不是重新发明目录和测试方式。

## 10. Source Plane 与 Artifact Plane

### Source Plane

- TypeScript Source；
- Unit / Integration；
- OpenAPI 静态生成；
- Fixture Replay；
- ESLint Boundary。

### Artifact Plane

- `tsc` 输出 ESM；
- Vite `dist`；
- Docker Image；
- Migration Bundle；
- plain Node 启动；
- Compose E2E。

Source 测试通过不代表发布产物可运行。CI 必须为 Artifact Plane 保留独立 Smoke Test。
