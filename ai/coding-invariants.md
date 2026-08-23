---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 编码不变量

以下规则必须由自动化测试、静态 Gate 或 Code Review 执行。

## Toolchain

- [ ] 全仓库只解析一个 TypeScript 6.x，采用单版本策略。
- [ ] 不存在 TypeScript 7、`@typescript/native` 或双版本兼容别名。
- [ ] 后端生产构建可由 plain Node 运行，不依赖 `tsx`。
- [ ] `createApplication()` Import 不创建 Server、DB、Pool、Timer 或 Signal。

## Architecture

- [ ] data-plane 不依赖 control-plane。
- [ ] core 不依赖具体 Feature。
- [ ] Control Feature 不直接依赖另一个 Control Feature。
- [ ] Application Composition 是连接具体实现的唯一位置。
- [ ] Feature Router 显式注册，不依赖文件扫描。
- [ ] 不为单一消费者预建 Workspace Package/Repository Interface。

## Control Plane HTTP

- [ ] 业务 API 使用 `createRoute` + typed handler。
- [ ] `operationId` lowerCamelCase、SDK-friendly、全局唯一。
- [ ] Route 有 tag/summary/description/responses。
- [ ] Error Response 绑定稳定 Error Code Example。
- [ ] OpenAPI 可无数据库静态导出。
- [ ] Generated API Types Freshness Gate 通过。
- [ ] `routes.ts` 不内联复杂数据库或审计流程。

## Protocol

- [ ] RouteRule.protocol 等于所有 RouteTarget Endpoint.protocol。
- [ ] 不存在 Chat ↔ Responses ↔ Anthropic 转换器。
- [ ] 未知请求字段保留。
- [ ] `messages`、`input`、`tools` 默认不可被通用 Patch 修改。
- [ ] SSE 上游字节不经重新序列化后返回。
- [ ] Gateway 自有错误只做入口协议 Envelope，不伪造上游来源。
- [ ] 数据面不使用控制面统一 Envelope 或不完整 Provider DTO。

## Streaming

- [ ] 主流遵守客户端背压。
- [ ] 客户端取消传播到上游 AbortSignal。
- [ ] Observer 使用有界 Queue，满载不阻塞主流。
- [ ] 不使用 `Response.clone()` / `ReadableStream.tee()` 做长期 Observer。
- [ ] Observer Error 只降低观测完整性。
- [ ] 首字节后禁止换 Key/Target。
- [ ] Shutdown 等待流、Observer 和 Recorder 静止。

## Routing

- [ ] Client > Harness > Global。
- [ ] Exact > Prefix > Glob > Regex。
- [ ] 歧义规则拒绝发布。
- [ ] Explain 与运行时使用同一 Resolver。
- [ ] 请求能力不参与模型选择。
- [ ] 总 Attempt 不超过 Budget。
- [ ] 相同输入 + Snapshot 得到相同结果。
- [ ] 编译失败不替换最后有效 Snapshot。

## Credentials

- [ ] Gateway Client Key 只保存哈希/HMAC。
- [ ] Provider Credential 只保存加密密文。
- [ ] Provider Key 不返回给 Harness。
- [ ] 429 主要冷却当前 Credential，不默认禁用整个 Provider。
- [ ] 401/403 记录为 Credential auth_failed。
- [ ] Secret 永不出现在日志、异常、Trace、Fixture、Snapshot、Raw Header 或默认导出。
- [ ] Connection Pool 按 origin 管理，不按 Credential 创建。

## Observability

- [ ] Request 与 Attempt 独立持久化。
- [ ] Request 成功可包含失败 Attempt。
- [ ] HTTP 200 不自动等于 Responses 语义成功。
- [ ] Client cancellation 不计为 Provider 5xx。
- [ ] TTFT 使用首个语义输出。
- [ ] Route Snapshot、模型和 Credential Mask 保存历史快照。
- [ ] observation_incomplete 与 request_failed 分离。
- [ ] 所有影响上游的行为可通过记录重建。

## Pricing

- [ ] 按实际上游模型计算。
- [ ] Request 成本为所有 Attempt 成本之和。
- [ ] 历史 Attempt 使用 PricingSnapshot。
- [ ] 未知价格/Usage 不得转换为 0。
- [ ] Manual Override 优先于 models.dev。
- [ ] Reasoning Token 不重复计费。
- [ ] Subscription 不被误显示为实际按量扣费。
- [ ] 金额持久化/API 不使用 JS `number` 作为权威值。

## UI

- [ ] 只承诺 Desktop >= 1280px，1024 保持核心任务可用。
- [ ] 高风险配置显式保存。
- [ ] 协议不一致是阻止性错误。
- [ ] Compatibility partial/ignored 明确展示影响。
- [ ] Key 完整值只在创建时显示。
- [ ] Request 列表未知费用显示 Unknown。
- [ ] 筛选由 URL 恢复。
- [ ] UI 只消费控制面 OpenAPI Client，不复制 Route Resolver。

## Vibecoding

- [ ] 根 AGENTS 只做地图，局部规则放局部 AGENTS。
- [ ] 非平凡决策有 Decision Note。
- [ ] 变更选择与表面匹配的最小充分证据。
- [ ] 完成报告列实际运行命令和结果。
- [ ] Agent Asset 引用的路径和 script 存在。
- [ ] Source Plane 与 Artifact Plane 都有证据。
- [ ] Change Scope 使用明确 Base，不由脚本猜测。
- [ ] 未识别路径保守升级为完整 Gate。
- [ ] 高风险运行时关系拥有 Source、Consumer、Negative Test 和 Manifest。
- [ ] Gate 自身有失败传播、循环和缺失依赖的负向测试。
- [ ] 逃逸缺陷通过 Postmortem 变成永久 Guard。
- [ ] 每个 Phase 收口和发布前执行简化审计。
