---
document_id: AIGW-TEST-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 测试与验收

## 1. 证据策略

本项目采用“最小充分本地证据 + 完整 CI 矩阵”。每次改动选择能捕获对应回归的测试，不默认重复运行全仓库；发布前必须验证 Source Plane 和 Artifact Plane。

详细 Gate 和变更矩阵见 [质量门禁与验证证据](quality-gates-and-evidence.md)。

## 2. 测试层级

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
├── matcher order
├── protected patch fields
└── chunk boundary independence

Integration
├── PostgreSQL/Drizzle
├── route snapshot publish
├── provider mock server
├── cancellation/backpressure
└── background jobs

OpenAPI Contract
├── operationId uniqueness
├── tags/description/responses
├── error examples
└── generated API types freshness

Keyless Protocol Snapshot
├── Chat JSON/SSE
├── Responses JSON/SSE
├── Anthropic JSON/SSE
├── Attempt timeline
└── routing explanation

Browser E2E
├── onboarding
├── route editor
├── request inspector
└── analytics filters

Artifact
├── tsc output under plain Node
├── Vite dist
├── Docker image
├── migration bundle
└── graceful shutdown

Live Provider
├── DeepSeek
├── 智谱
└── Kimi
```

Live Provider 不成为普通无 Key CI 的硬依赖。

## 3. TypeScript 与架构门禁

必须验证：

- 所有 Workspace 只解析一个 TypeScript 6.x；
- 不存在 TypeScript 7、Native Compiler 和兼容别名；
- `data-plane → control-plane` Import 被拒绝；
- `core → feature` Import 被拒绝；
- Control Feature 跨 Feature Import 被拒绝；
- Web Feature 跨 Feature Import 被拒绝；
- Application Composition 可以安全 Import 且无副作用；
- Generated/UI Vendor 目录使用专用 Lint Override，而不是被项目品味规则改写。

边界规则必须有负向 Fixture：临时或测试输入故意创建非法 Import，证明 Gate 会红。

## 4. OpenAPI 与 Route 合同

每个 Control Operation 断言：

- `operationId` 存在且全局唯一；
- `tags`、`summary`、`description` 存在；
- 至少一个 2xx Response；
- 每个 Response 有 Schema；
- 每个错误 Response 有对应 Error Code Example；
- Security Scheme 正确；
- Success/Error Envelope Required 字段无漂移；
- OpenAPI 可在不启动 Server、Timer 和数据库的情况下导出；
- 生成 Web Client 与临时重生成结果一致。

数据面入口不使用该 Contract Test 代替协议 Fixture。

## 5. Routing 测试矩阵

- Client exact 覆盖 Harness exact；
- Harness exact 覆盖 Global exact；
- Exact > Prefix > Glob > Regex；
- 相同优先级模式更长者优先；
- 完全歧义拒绝发布；
- 禁用 Rule 不匹配；
- 无 Rule 返回 `gateway_no_route`；
- Responses Rule 指向 Chat Endpoint 被拒绝；
- Explain 与实际选择一致；
- `[1m]` 等模型后缀不被随意删除；
- 大小写行为与 Profile 定义一致；
- 同一 Context + Snapshot 始终得到相同 Resolution；
- Snapshot 编译失败不替换当前有效版本；
- Saved/Published Version 可区分。

## 6. 多 Credential

- 同优先级 Round Robin；
- 高优先级池有可用 Key 时不使用低优先级；
- 429 只冷却当前 Key；
- 冷却 Key 被排除；
- Retry-After 被解析并受上限约束；
- 401/403 标记 auth_failed；
- 主 Key 429、备用 Key 200；
- 所有 Key 不可用返回稳定 Gateway Error；
- pinned Credential 失效不扩大到未授权账号；
- 手动解除冷却后重新参与；
- 并发 Round Robin 不产生明显偏斜或非法重复状态；
- Credential 明文不进入断言输出。

## 7. 协议代理

每个协议执行：

- 未知字段保留；
- Model Rewrite；
- Gateway Auth 被替换；
- Cookie/Client Authorization 不透传；
- Query 合并；
- Body Patch 三种模式；
- Protected Field 拒绝；
- 非流式成功 Body/Status/Header；
- 上游错误保持协议语义；
- Gateway Error 使用入口协议最小兼容 Envelope；
- Request Size/Spool Limit；
- 不支持 Content-Encoding 明确失败；
- Redirect 和 SSRF 策略；
- Provider 实际收到的请求与期望一致。

## 8. Streaming 与 Observer

- Chunk 边界随机切分；
- 多字节 UTF-8 跨 Chunk；
- 心跳/注释事件；
- 首个空事件不算 TTFT；
- Usage 位于末尾；
- Responses 语义失败；
- 上游中途断开；
- 客户端取消传播；
- 主路径 Backpressure；
- Observer Parser 抛错但客户端继续；
- Observer Queue 满标记 `observation_incomplete`；
- Observer 不读取时内存仍有上限；
- 首字节后不回退；
- Raw Payload 截断不阻塞；
- 禁止 `Response.clone()` / `ReadableStream.tee()` / SSE 重序列化；
- 50 并发长流下 RSS 和 Event Loop Lag 在预算内。

## 9. Keyless Protocol Snapshot

Fixture 应通过真实组装入口运行，至少保存：

```text
ingress-request.json
expected-upstream-request.json
upstream-response.chunks.jsonl
expected-downstream-response.bin
expected-request-record.json
expected-attempts.json
expected-observation.json
expected-routing-explanation.json
```

Snapshot Diff 必须人工审查，不能用宽松 Normalizer 隐藏：

- 字段丢失；
- Chunk 顺序变化；
- Error Code 变化；
- Attempt 数变化；
- Route/Credential 选择变化；
- Secret 泄露。

## 10. Request/Attempt

场景：

```text
Attempt 1 429
Attempt 2 200
```

断言：

```text
Request.final_status = succeeded
Request.attempt_count = 2
Request.fallback = true
Attempt 1.error_category = upstream_rate_limit
Attempt 2.status = succeeded
Request.routing_snapshot_version is recorded
Request cost = Attempt1 + Attempt2（unknown 保持 partial）
```

额外断言：

- 重试不创建第二条逻辑 Request；
- Request Success 可包含 Failed Attempt；
- Client Cancel 与 Provider Error 分离；
- HTTP Status 与 semantic status 分离；
- Timeline 顺序确定；
- Attempt Sequence 连续；
- 失败写入不改变已发送协议响应。

## 11. Usage 和 Cost

- Cache Token 独立费率；
- Reasoning 包含/不包含 Output 两种规则；
- 价格生效日期；
- Account Override；
- unknown Rate；
- Usage 缺失或 partial；
- Failed Attempt；
- Subscription/Free；
- 汇率显示；
- Historical PricingSnapshot 不变；
- models.dev 不覆盖 Manual；
- API 金额使用 string/Decimal，不经过 JS Float 权威计算。

## 12. Secret 与安全

自动扫描：

- 测试 Key 不出现在应用日志；
- 数据库 Dump 中 Gateway Key 不明文；
- Provider Secret 只有密文；
- Raw Request Header 脱敏；
- Error Body/Stack/Metadata 脱敏；
- Fixture/Snapshot/Screenshot 无真实 Secret；
- Export 默认无 Secret；
- Secret 创建响应 `Cache-Control: no-store`；
- Master Key 缺失/错误时 Fail Loud；
- 临时 Spool 目录私有、随机文件名、owner-only 权限。

## 13. UI E2E

### Onboarding

- 添加 Provider/Endpoint；
- 添加 Credential；
- Probe；
- 创建 Routing Rule；
- 创建 Client；
- 复制配置；
- 发起测试 Request；
- 跳转 Request Inspector。

### Routing Rule Editor

- 协议不一致无法保存；
- 高级设置折叠；
- 未保存离开提示；
- Explain 使用服务端 Resolver；
- 保存与发布状态分离；
- 发布失败继续显示上一 Snapshot；
- 兼容性警告可追溯。

### Request Inspector

- 服务端分页；
- URL 筛选和选中状态恢复；
- 行选择更新详情；
- Resizable 键盘操作；
- Raw Payload 脱敏；
- Attempt Timeline；
- unknown/partial Cost；
- success_with_fallback 明确展示。

## 14. 验证真实外部结果

E2E 不只断言 UI Toast 或 API `success`：

- 重读 PostgreSQL Request/Attempt；
- 检查 Mock Provider 实际收到的 Request；
- 比较客户端实际字节；
- 检查 Abort 后上游连接终止；
- 检查未修改配置仍字节相同；
- Shutdown 后无残留 Socket/Timer/Write Queue。

## 15. Artifact 验证

```text
pnpm build
→ plain Node 运行 gateway dist
→ Docker build
→ Compose PostgreSQL + Gateway + Mock Provider
→ Migration
→ Playwright Golden Journey
→ Graceful Shutdown
```

Source 模式 `tsx` 成功不能替代 Artifact 验证。

## 16. 性能测试

建议：

- 100 并发短非流式请求；
- 50 并发 5 分钟 SSE；
- 10MB Request 拒绝或 Spool；
- 100 万 Request 元数据列表查询；
- Dashboard 30 天查询；
- Routing Snapshot 1000 Rule；
- Credential Pool 100 Key 压力上限。

记录：

```text
TTFT overhead
CPU
RSS
DB write latency
stream buffer size
observer drop rate
event loop lag
open sockets after shutdown
```

## 17. Provider 兼容性回归

每个结果记录：

```text
provider
endpoint
model
protocol
harness version
gateway version
tested_at
request fixture
response fixture
result
```

升级 Harness/Provider 时复用相同 Fixture。Live Test 自跳过无 Key 环境，不影响 Keyless CI。

## 18. 发布门禁

- TypeScript 6 单版本；
- Architecture Boundary；
- 产品/协议/Secret 不变量；
- OpenAPI Contract 和 Generated API Types Freshness；
- Migration Upgrade；
- Keyless Protocol Snapshot；
- UI Golden Journey；
- plain Node/Docker Artifact E2E；
- Secret Scan；
- JSON Schema/OpenAPI/Markdown Links；
- Agent Asset Freshness；
- 发布包不含真实 Secret、旧规范和临时 Plan；
- Provider Compatibility 有验证日期；
- Decision/CHANGELOG 同步。
