---
status: normative
last_reviewed_at: 2026-08-23
language: zh-CN
---

# AI 可执行任务拆解

每个任务应独立、可验证，并按 `ai/change-evidence-matrix.md` 选择证据。

## EPIC-00 Engineering Spine

### T-0001 Workspace + TypeScript 6

- 创建 `apps/gateway`、`apps/web`、`apps/e2e`。
- 根只安装 TypeScript 6.x 单版本。
- 配置 NodeNext/Bundler tsconfig。
- 验收：`verify:typescript-version` + 全 Workspace Typecheck。

### T-0002 Composition + Lifecycle

- `createApplication(deps)` 无副作用。
- `lifecycle.ts` 创建 DB/Undici/PayloadStore/Server/Timer。
- 固定 Graceful Shutdown 顺序。
- 验收：Import Test + Artifact Shutdown Smoke。

### T-0003 Static Boundaries

- ESLint Boundary：app/control/data/core/db/web。
- Feature Isolation。
- 复杂度棘轮。
- 验收：正向通过 + 故意非法 Fixture 被拒绝。

### T-0004 Quality Gate Runner

- `check:quick/control/data/protocol/db/web/e2e/artifact/docs/all/ci`。
- 有限并发和耗时摘要。
- 验收：失败 Gate 非零退出并保留诊断。

### T-0005 Agent Governance

- 根/局部 AGENTS。
- Decision Note/Plan 模板。
- Agent Asset Freshness。
- Golden Path 和 Evidence Matrix。

## EPIC-01 Control Golden Path

### T-0101 Control HTTP Core

- `createControlRouter()`、Validation Hook、Envelope、Error Registry、requestId。

### T-0102 Connections Feature

- `routes.ts`、`handlers.ts`、`schemas.ts`、`service.ts`、`index.ts`。
- Drizzle Schema/Migration。

### T-0103 OpenAPI Pipeline

- 静态导出 `admin-openapi.json`。
- Contract Test。
- `openapi-typescript + openapi-fetch + openapi-react-query`。
- Generated API Types Freshness。

### T-0104 Connections UI

- List/Create；loading/empty/error；Secret 不回填。

### T-0105 Control E2E

- Browser → built Gateway → PostgreSQL。

## EPIC-02 Data Golden Path

### T-0201 Gateway Client Key

- 假开发 Key、哈希/HMAC 验证、中间件。

### T-0202 In-memory Routing Snapshot

- 最小 RouteRule/RouteTarget；纯 Resolver；Snapshot Version。

### T-0203 Undici Mock Provider

- 按 origin Pool；有限连接；Abort/Timeout。

### T-0204 Chat Non-streaming

- 未知字段、Model/Header 改写、原样响应。

### T-0205 Chat SSE

- 原始字节转发、Backpressure、Abort、首字节边界。

### T-0206 Bounded Observer Tap

- 有界 Queue、Usage/TTFT、过载降级。

### T-0207 Request/Attempt

- PostgreSQL 行、Sequence、Snapshot/Credential 快照。

### T-0208 Data Snapshot + Inspector

- Keyless Fixture、Request Inspector 最小页、Artifact E2E。

## EPIC-03 Secrets and Clients

### T-0301 Master Key File
### T-0302 Provider Credential Cipher
### T-0303 Gateway Client Key Rotation
### T-0304 Secret Redaction/Export Scan
### T-0305 Client UI / Config Generator

## EPIC-04 Providers

### T-0401 Provider/Endpoint CRUD
### T-0402 Account/Credential CRUD
### T-0403 EndpointCredential/Priority
### T-0404 Built-in Presets
### T-0405 Credential Probe
### T-0406 Connections UI Completion

## EPIC-05 Routing

### T-0501 Route Schema/Migration
### T-0502 Matcher/Property Tests
### T-0503 Compiler/Atomic Snapshot
### T-0504 Resolver/Explain
### T-0505 Credential Scheduler
### T-0506 Retry/Fallback Budget
### T-0507 Cooldown/Circuit State
### T-0508 Route UI/Simulator

## EPIC-06 Protocols

### OpenAI Chat
- Chat observer/usage/full fixtures。

### OpenAI Responses / Codex
- Responses ingress/observer/semantic status。
- Codex Profile/config/models/tool fixtures。

### Anthropic / Claude Code
- Messages ingress/observer。
- Claude slots/tool/thinking fixtures。

## EPIC-07 Models and Pricing

- ModelDefinition/Binding。
- models.dev Snapshot/Provenance。
- PricingRule/Snapshot。
- Usage/Cost。
- Models UI。

## EPIC-08 Observability

- Request/Attempt/Timeline。
- PayloadStore/Retention。
- Requests Table/Inspector。
- Aggregate Jobs/Dashboard/Analytics。

## EPIC-09 Operations

- Better Auth Admin。
- Backup/Restore。
- Migration Upgrade。
- Health/System UI。
- Performance Benchmark。
- Release Artifact。

## 单任务模板

```text
目标
非目标
受影响不变量
参考 Golden Path / Decision
输入/输出
领域/API/DB/UI 变化
实现步骤
最小充分证据
Artifact 影响
文档更新
回滚方式
```
