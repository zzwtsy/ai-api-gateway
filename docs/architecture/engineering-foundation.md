---
document_id: AIGW-ENG-001
status: normative
last_reviewed_at: 2026-08-23
language: zh-CN
---

# 工程基础与技术栈

## 1. 决策结论

本项目采用**单一仓库、多种生成投影**：源码、模块化规范、Decision Note、Agent 规则、测试和生成脚本在同一个 Git Commit 中演进。

```text
当前源码与模块化文档
→ 类型、合同和协议测试
→ OpenAPI / 前端类型投影
→ 单文件中文规范
→ 编译产物与 Docker Image
```

仓库已经完成工程 Spine 和两条端到端黄金路径，不再维护独立“规范版本”和“模板版本”。项目根 `package.json` 与 Git Tag 是唯一版本事实；`.artifacts/spec/` 中的完整规范、工程规范和前端规范由 `pnpm docs:bundle` 生成。

这种形态避免以下漂移：

- 控制面 Route 已修改，但独立规范仍描述旧契约；
- 数据面 Streaming 已修正，但模板继续复制旧实现；
- TypeScript、目录边界和质量 Gate 在两个版本线中不一致；
- Agent 同时命中历史设计稿、旧模板说明和当前源码；
- 单文件规范被手工修补，无法回溯到模块化源文档。

当前已实现能力与 Bootstrap 边界见 [当前实现状态](current-implementation.md)，交付形态决策见 [单一仓库与生成投影](../decisions/implemented/2026-08-22-unified-repository-and-generated-projections.md)。

## 2. 技术基线

| 层级 | 选择 | 工程要求 |
| --- | --- | --- |
| Runtime | Node.js 24 LTS | 生产运行时只承诺 Node 24；使用原生 ESM |
| Language | TypeScript 6.x | 单版本；全仓库 `strict`；不得并存 TypeScript 7、Native Preview 或兼容别名 |
| Workspace | pnpm workspace | 初期不引入 Turborepo；根脚本负责聚合 |
| HTTP Server | Hono + `@hono/node-server` | 同一部署单元承载数据面、控制面和静态 Web |
| Upstream Transport | Undici `Pool` / `Dispatcher` | 按上游 origin 复用有限连接池；显式 Abort、Timeout 与 Redirect 策略 |
| Control API | `@hono/zod-openapi` + Zod + Scalar | `createRoute` 是控制面 HTTP 契约事实来源 |
| Admin Auth | Better Auth | 单管理员 Session；禁用公共注册和企业组织能力 |
| Database | PostgreSQL | 配置、Request/Attempt、聚合和状态统一存储 |
| Data Access | Drizzle ORM | 稳定版精确锁定；复杂统计允许显式 SQL |
| Logging | Pino JSON logging | request-scoped metadata；集中脱敏；生产 JSONL |
| Frontend | React + Vite | SPA；不引入 SSR、RSC 或 Next.js |
| UI | shadcn/ui + Tailwind CSS | `components.json` 是组件事实来源 |
| Frontend Data | TanStack Router / Query / Table / Virtual | URL 状态、服务端缓存、高密度表格和虚拟化 |
| Forms | React Hook Form + Zod | 表单草稿与控制面 Schema 对齐 |
| Charts | shadcn Chart + Recharts | 前端只渲染服务端已聚合数据 |
| API Client | openapi-typescript + openapi-fetch + openapi-react-query | OpenAPI 只生成类型；Fetch 负责传输；TanStack Query 是唯一服务端状态所有者 |
| Tests | Vitest + fast-check + Testcontainers + Playwright | 单元、属性、PostgreSQL 集成、浏览器与协议回放 |
| Static Gates | ESLint + eslint-plugin-boundaries + Knip + jscpd | 架构边界、未使用代码和重复代码机械化检查 |
| Git Hooks | Lefthook | 本地门禁保持快速；完整矩阵由 CI 负责 |
| Deployment | Docker Compose | 一个 Gateway 容器、一个 PostgreSQL 容器；可选反向代理 |
| Raw Payload | 可替换 `PayloadStore`，首版为本地文件系统 | PostgreSQL 保存索引、哈希、大小和保留策略，不保存无限大正文 |

## 3. TypeScript 6 单版本合同

### 3.1 版本政策

全仓库只安装一个 TypeScript 版本。各 Package 通过默认 Catalog 引用：

```json
{
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

根 `pnpm-workspace.yaml` 是唯一版本所有者，锁定一个经过验证的稳定补丁版本：

```yaml
catalog:
  typescript: 6.0.3
```

禁止：

- 同时安装 TypeScript 6 和 TypeScript 7；
- 使用 `@typescript/native`；
- 使用 `@typescript/typescript6` 兼容别名；
- 在不同 Workspace 中声明不同 TypeScript Major；
- 让 IDE、CI 和构建脚本解析到不同的 TypeScript 可执行文件。

### 3.2 编译配置

共享基线至少启用：

```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true,
    "isolatedDeclarations": true,
    "skipLibCheck": false
  }
}
```

后端使用 Node ESM 语义：

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

前端使用 Bundler 语义：

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler"
  }
}
```

### 3.3 构建策略

- 后端生产构建默认使用 `tsc -b` 输出普通 ESM JavaScript；
- 前端由 Vite 构建；
- 不为了 Tree Shaking 把后端强行打成单文件；
- 后端发布单位是 Docker Image，不是一个不可调试的 Bundle；
- 可执行脚本可以使用 `tsx` 开发运行，但发布路径必须由 plain Node 验证。

## 4. 一个部署单元，两个逻辑平面

```text
┌─────────────────────────────────────────────────────────────┐
│ Gateway Process                                             │
│                                                             │
│  Data Plane                                                 │
│  Ingress → Client Key → Route Snapshot → Credential         │
│          → Undici Pool → Upstream → Raw Stream              │
│                              └→ Bounded Observer Tap         │
│                                                             │
│  Control Plane                                              │
│  Better Auth → OpenAPI Admin API → PostgreSQL               │
│              → Compile Snapshot → Atomic Publish            │
│                                                             │
│  Web                                                        │
│  Vite build static assets                                   │
└─────────────────────────────────────────────────────────────┘
```

部署上保持一个 Node 进程，代码上必须严格分离：

- 数据面处理 Harness 请求，是延迟和正确性关键路径；
- 控制面管理配置、认证、查询和发布 Snapshot；
- Web 只消费控制面 API；
- Application Composition Root 是连接具体实现的唯一位置。

## 5. 数据面技术原则

### 5.1 Hono 只负责入口

Hono 负责：

- 路径与方法匹配；
- Gateway Client Key 中间件；
- 请求 ID 和基础上下文；
- 将请求交给协议入口处理器；
- 将原始响应流写回客户端。

Hono 不负责：

- 用完整 DTO 重建 Provider 请求；
- 统一不同 AI 协议；
- 隐式重试；
- 根据数据库热查询决定路由。

### 5.2 Undici 负责上游传输

每个上游 origin 使用有限连接数的 `Pool`，而不是每个 Credential 一个连接池。Transport 必须显式控制：

- `AbortSignal`；
- connect timeout；
- response headers timeout；
- chunk idle/body timeout；
- 最大连接数；
- Redirect；
- TLS 与可选代理；
- 原始响应 Header；
- 是否启用 HTTP/2。

普通控制面请求可以使用 `fetch()`；数据面核心必须通过可注入的 Undici Dispatcher。

### 5.3 有界 Observer Tap

数据面禁止使用 `Response.clone()` 或 `ReadableStream.tee()` 作为长期观测机制。正确模型：

```text
Upstream chunk
├── Main path: await downstream write，遵守客户端背压
└── Observer: try enqueue 到有界队列
              ├── 成功：异步提取 Usage / TTFT / Error
              └── 队列满：标记 observation_incomplete，不阻塞主路径
```

Observer 失败只能影响观测完整性，不能改变已合法建立的客户端响应。

## 6. 控制面技术原则

控制面采用严格 JSON 契约：

```text
createRoute
→ typed handler
→ service
→ Drizzle/PostgreSQL
→ OpenAPI document
→ generated frontend OpenAPI types
```

控制面 Route、Handler、Service 的职责与详细模式见 [HTTP 契约与路由定义](../conventions/http-contracts-and-route-definition.md)。

## 7. 配置发布与运行时快照

数据面不得为每次请求联表查询配置。控制面写配置后执行：

```text
数据库事务提交
→ 读取完整有效配置
→ 编译 immutable RoutingSnapshot
→ 运行全部引用和协议校验
→ 原子替换当前 Snapshot
→ 记录发布版本和结果
```

失败时：

- 数据库保留已保存草稿或失败版本；
- 当前数据面继续使用最后一个有效 Snapshot；
- UI 显示“已保存但未发布”或“发布失败”；
- 不允许部分新配置进入运行时。

## 8. 初期不采用的技术

| 技术 | 初期结论 | 触发重新评估的证据 |
| --- | --- | --- |
| Rust/Go 数据面 | 不采用 | Node 数据面经真实压测出现无法通过结构优化解决的瓶颈 |
| Redis | 不采用 | 多实例需要跨进程状态、低延迟协调且 PostgreSQL 通知不足 |
| ClickHouse | 不采用 | PostgreSQL 聚合表无法满足实际数据量和查询 SLA |
| Kafka/消息队列 | 不采用 | 出现多个独立消费者和需要持久重放的事件流 |
| Kubernetes | 不采用 | 产品从个人单机部署演进为受支持的多实例服务 |
| Next.js | 不采用 | 出现 SSR、SEO 或 Server Component 的真实需求 |
| Provider SDK 作为代理核心 | 不采用 | 无；其对象模型与协议透明边界冲突 |
| Everything-is-a-plugin | 不采用 | 出现稳定的第三方扩展生态和版本化插件 API 需求 |
| 预建大量 Workspace Package | 不采用 | 至少两个真实消费者或独立发布边界出现 |

## 9. 工程参考的吸收边界

本规范吸收以下设计思想：

- 从 `hono-openapi-starter` 吸收显式 `routes.ts → handlers.ts → service.ts → index.ts`、OpenAPI 生成闭环、Application Composition 和依赖边界门禁；
- 从 `deepseek-harness` 吸收 Agent 文档路由、Decision Note、按变更选择最小充分证据、Keyless Snapshot、Source/Artifact 双路径和可执行不变量；
- 不复制企业 IAM、Everything-is-a-plugin、过度拆包、全仓库每文件 100% 覆盖率和庞大平台矩阵。

参考文件与链接见 [参考来源](../references/source-index.md)。
