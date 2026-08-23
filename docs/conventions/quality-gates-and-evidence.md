---
document_id: AIGW-QUALITY-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 质量门禁与验证证据

## 1. 证据原则

每个改动必须选择能够捕获该回归的**最小充分证据**。本地默认不运行整个仓库矩阵；CI 负责完整、并行和发布形态验证。

证据必须匹配变更表面：

- 行为变化由行为测试证明；
- HTTP 契约由 OpenAPI Contract 证明；
- 协议透明性由原始 Fixture/字节比较证明；
- 数据库约束由真实 PostgreSQL 证明；
- UI 流程由浏览器证明；
- 发布路径由 Build/Docker 证明；
- 文档与 Agent 规则由静态 Gate 证明。

## 2. 建议根命令

```text
pnpm check:quick
pnpm check:control
pnpm check:data
pnpm check:protocol
pnpm check:db
pnpm check:web
pnpm check:e2e
pnpm check:artifact
pnpm check:docs
pnpm check:all
pnpm check:ci
```

### `check:quick`

- 仓库脚本自测与 Gate 合同；
- TypeScript 单版本、架构边界、相对 Import、Runtime Invariant 和 Secret 静态检查；
- Gateway 与 Web Typecheck；
- Gateway Unit Test。

暂存文件 Lint 由 Pre-commit Hook 负责；`check:quick` 不重复完整类型感知 Lint。

### `check:control`

- `check:quick` 的静态基础；
- Gateway/Web Typecheck；
- Control Plane OpenAPI Contract；
- Generated API Types Freshness。

### `check:data`

- 数据面协议单元；
- Routing/Transport/Observation/Recording 不变量；
- Keyless 真实组合协议 Snapshot。

Credential Scheduler、Retry/Fallback Compiler 尚未实现；实现后加入该 Gate，而不是在文档中提前宣称已覆盖。

### `check:protocol`

- 当前已实现协议的 Data Plane 单元测试；
- Property Test；
- Keyless 真实组合 Snapshot；
- Data Plane Golden Path。

当前只覆盖 OpenAI Chat Completions。Responses 与 Anthropic Messages 在实现时分别新增 Fixture 和 Gate 证据。

### `check:db`

- Migration/Journal/Snapshot 静态一致性；
- Gateway Typecheck；
- PostgreSQL/Testcontainers Integration；
- Request/Attempt 持久化约束。

### `check:web`

- Web Typecheck；
- Web Unit Test；
- Vite Production Build。

### `check:e2e`

- Gateway/Web/E2E Typecheck；
- Gateway 与 Web Production Build；
- Playwright 对编译后 Gateway 和静态 Web 运行 Golden Journey；
- Mock Provider 实收与 Request/Attempt 检查。

### `check:artifact`

- Gateway/Web Production Build；
- plain Node 构建产物 Smoke；
- 编译产物浏览器 Golden Path；
- Docker Compose + PostgreSQL + Mock Provider 发布形态 Smoke。

### `check:docs`

- 仓库脚本自测；
- Decision Note 生命周期；
- 自动生成模块图；
- 中文文档、链接、版本与规范投影；
- 根项目版本、CHANGELOG 与全部同步投影；
- Agent/Skill 资产和 Secret 静态检查。

## 3. 测试层级

```text
Unit
├── matcher / compiler
├── credential scheduler
├── patch merge
├── error classification
├── usage normalization
├── cost calculation
└── secret redaction

Property
├── unknown JSON field preservation
├── deterministic routing
├── matcher ordering
├── patch protected fields
└── chunk boundary independence

Integration
├── PostgreSQL + Drizzle
├── route snapshot publish
├── provider mock server
├── cancellation/backpressure
└── background aggregation

Keyless Snapshot
├── forwarded request
├── raw downstream bytes
├── Attempt timeline
├── routing explanation
├── error/usage/cost observation
└── Web request inspector

Browser E2E
├── onboarding
├── connection → route → client
├── test request
└── request inspector

Live Provider
├── DeepSeek
├── 智谱
└── Kimi
```

Live Provider Test 是可选/定时证据，不阻塞无 Key 的普通贡献者。

## 4. Keyless Protocol Snapshot

每个协议场景建议：

```text
fixtures/protocols/openai-chat/<scenario>/
├── ingress-request.json
├── expected-upstream-request.json
├── upstream-response.chunks.jsonl
├── expected-downstream-response.bin
├── expected-request-record.json
├── expected-attempts.json
├── expected-observation.json
└── expected-routing-explanation.json
```

Snapshot 必须通过真实的组装入口运行：

```text
Gateway request
→ Data Plane Router
→ Routing Snapshot
→ Credential Selector
→ Mock Provider
→ Stream Tap
→ Recorder
```

不能只对一个孤立 Parser 调用后比较对象。

## 5. 验证外部世界

E2E 不得只断言系统自己的“成功”消息。应检查：

- Mock Provider 实际收到的 Header、Query 和 Body；
- 客户端实际收到的字节；
- 数据库 Request 与 Attempt；
- 实际使用的 Snapshot Version 和 Credential ID；
- 未触及文件/配置仍保持不变；
- Client Cancel 后上游请求真正终止；
- Shutdown 后没有遗留 Socket、Timer 和写入任务。

## 6. Source 与 Artifact 证据

Source Plane：

```text
Typecheck
Unit
Property
Integration
OpenAPI
Snapshot
Static Boundaries
```

Artifact Plane：

```text
tsc output under plain Node
Vite dist
Docker image
Compose deployment
Migration from packaged files
Browser against built server
```

必须保留至少一个 Artifact Plane CI Lane。`tsx` 开发模式成功不能替代 plain Node 生产路径。

远端 Release 只接受 `main` 上相同 SHA 主 CI 已全部成功的 Commit。发布 Workflow 在任何写入前验证版本、CHANGELOG、Release Commit 与 Git Tag 归属，并在镜像推送前验证 GHCR `<version>` 与 `sha-<commit>` 两个标签共同指向同一 Manifest；镜像、Annotated Tag 和 GitHub Release 的顺序与权限由静态合同测试约束。

源码归档不包含 `.git`，因此发布包必须携带 `.artifacts/source-metadata.json`。规范生成器在 Git Checkout 中读取真实 `HEAD`，在源码归档中读取该元数据，使两种入口重建相同版本和 Commit 的规范投影。

正式 UI 证据在录制前后都必须读取真实 Git HEAD 与工作树状态；任一身份变化都使整次临时产物失效。`metadata.json` 记录完整 Git Object ID，`dirty` 来自真实状态，只有 Dirty 证据写入未验证说明。Clean 证据进入 `<full-sha>/<scenario>`，Dirty 证据进入 `dirty-<short-sha>/<scenario>`，不得用环境变量伪造 Commit 身份。

## 7. 覆盖率政策

不采用全仓库每文件 100% 的统一门槛。采用风险分级：

### 高风险纯逻辑

目标接近完整 Branch Coverage：

- Route Compiler/Resolver；
- Credential Scheduler；
- Retry/Fallback Decision；
- Error Classifier；
- Cost Calculator；
- Secret Redaction；
- Protocol Observer；
- Snapshot Publisher。

### 装配与展示

使用行为测试，不为覆盖率机械执行每一行：

- Application Composition；
- 薄 Handler；
- UI Layout；
- Static Config；
- Generated Code。

未覆盖代码首先判断是否应删除，而不是自动增加无意义测试。

## 8. 变更到证据矩阵

| 变更 | 至少运行 |
| --- | --- |
| 新增控制面 Route | Route Unit + OpenAPI Contract + Generated API Types Check |
| 修改公开 Zod Schema | Typecheck + OpenAPI Contract + Frontend Compile |
| 修改 Routing | Unit + Property + Routing Snapshot |
| 修改 Credential 调度 | Unit + Cooldown/Concurrency Integration |
| 修改 Streaming | Raw Fixture + Abort + Backpressure + Random Chunk Test |
| 修改 Provider Adapter | Mock Provider Integration + Usage/Error Snapshot |
| 修改 Request/Attempt Schema | Migration + Testcontainers + Request Timeline Snapshot |
| 修改 Secret | Redaction + Dump/Log/Export Negative Test |
| 修改前端请求详情 | Component + Playwright + URL Restore |
| 修改构建/入口 | Build + plain Node + Docker Smoke |
| 修改 Docs/AGENTS/Skill | Link + Script Reference + Agent Asset Check |
| 修改依赖边界 | ESLint Boundary + Architecture Doc |
| 修改 TypeScript 配置 | 全 Workspace Typecheck + Version Policy Gate |

## 9. 当前 CI Lane

CI 从同一 Gate 定义生成四个明确证明面，Workflow 不重新维护另一套检查顺序：

### `static`

- 仓库脚本自测；
- TypeScript 单版本和 Workspace Typecheck；
- 架构边界、Import、Secret、Migration；
- Decision、Agent Asset、模块图和规范投影；
- 类型感知 Lint、Knip、jscpd。

### `core`

- Gateway 关键模块 Coverage；
- 控制面 OpenAPI Contract；
- Generated API Types Freshness；
- Web Unit 和 Build。

### `protocol`

- Data Plane 协议单元；
- Keyless 真实组合 Snapshot；
- Golden Path；
- PostgreSQL/Testcontainers Integration。

### `artifact`

- 后端和 Web 生产构建；
- plain Node Smoke；
- 编译产物浏览器 Golden Path；
- Docker Compose + PostgreSQL + Mock Provider 发布形态 Smoke。

每个 Lane 写出机器可读 Gate Report；同一 PR 的新提交取消旧 Head。完整定义见 `scripts/gates/definitions.mjs`，CI 只调用 `check:ci:*`。

## 10. Git Hook

本地 Hook 保持快速：

```text
pre-commit
├── staged ESLint/fix
├── scripts 变更时运行仓库脚本自测
├── Decision 变更时运行格式检查
└── git diff --cached --check

pre-push
└── check:quick
```

Hook 不运行完整 Docker E2E；CI 拥有完整矩阵。推送前由 Skill 使用显式 Base 运行 `change-scope` 和 `evidence:select`。

## 11. Gate Runner

`node scripts/check.mjs <mode> [--report <path>]` 通过一个 JavaScript Gate DAG 表达依赖和有限并发：

```ts
interface Gate {
  id: string;
  label: string;
  command: string;
  args: string[];
  needs: string[]; // 必须通过
  after: string[]; // 只要求完成
}
```

执行前拒绝重复 ID、缺失依赖、自依赖和循环；必需依赖失败会显式跳过下游并使聚合失败。报告包含命令、耗时、退出码、Signal、跳过原因和最终状态。依赖图、失败传播和 `after` 语义都有 Node 内置测试。

## 12. 发布门禁

- TypeScript 6 单版本验证通过；
- 所有产品与工程不变量通过；
- OpenAPI 与生成客户端无漂移；
- Schema/Migration 可从支持的前一版本升级；
- Keyless Protocol Snapshot 通过；
- Artifact/Docker E2E 通过；
- Secret Scan 通过；
- 文档和 Agent Asset 链接有效；
- 发布包不含历史规范、真实 Secret、测试凭证或临时计划；
- CHANGELOG 与 Decision Note 同步。
