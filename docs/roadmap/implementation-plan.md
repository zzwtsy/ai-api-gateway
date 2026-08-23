---
status: active
last_reviewed_at: 2026-08-22
language: zh-CN
project_version: 0.1.0-alpha.3
---

# 实施路线图

本路线图以当前已合并仓库为起点。阶段顺序用于控制风险和建立可复制的纵向切片，不代表时间承诺。

## 1. 当前基线

已经完成：

- Node.js 24 + TypeScript 6.0.3 单版本 Workspace；
- Gateway、Web、E2E 三个 App；
- 显式 Application Composition 和 Lifecycle；
- 控制面 `createRoute → Handler → Service/Repository → OpenAPI → Web Client`；
- OpenAI Chat 数据面原始流式黄金路径；
- Gateway Client Key 与 Provider Credential 类型分离；
- 不可变 Bootstrap RoutingSnapshot；
- Undici 按 Origin 连接池；
- 有界 Observer Tap；
- Request / Attempt 分离记录；
- PostgreSQL / Drizzle 初始 Migration；
- 中文优先文档与 Web UI；
- AGENTS、Skill、Decision Note 和质量 Gate；
- 模块化规范与 `pnpm docs:bundle` 生成投影；
- 显式 Change Scope、Evidence Selector 和 Gate DAG；
- 模块运行时不变量清单与负向自测；
- Keyless 真实组合 Snapshot；
- plain Node、编译产物浏览器和 Docker Artifact Lane；
- Postmortem 与阶段性简化审计；
- shadcn `base-nova` + Base UI 前端组件基线；
- Antfu ESLint Flat Config 基线与项目增量边界；
- Browser / Node TypeScript Project Reference；
- 官方工具链静态门禁与联网安装探针。

Bootstrap 实现不得被当作完整产品能力，准确范围见 [当前实现状态](../architecture/current-implementation.md)。

## 2. Phase 1：连接、账号和加密凭据

### 目标

把环境变量中的单个 Provider Credential 替换为控制面管理的耐久配置。

### 交付

- Provider / UpstreamEndpoint / Account / Credential 数据表；
- `SecretCipher` AES-256-GCM 实现和主密钥轮换上下文；
- Provider Credential 创建、轮换、禁用和一次性展示；
- Connection 详情中的 Endpoint、账号和凭据状态；
- Probe：鉴权、模型列表、最小调用和延迟；
- 日志、导出和诊断包的 Secret Redaction；
- Empty/Upgrade Migration、Testcontainers 和浏览器旅程。

### 验收

- 数据库不保存 Provider Credential 明文；
- Control API 永不回填完整 Secret；
- Data Plane 只在真正发送上游请求时解密；
- 同一 Origin 的多个 Credential 共享 Transport Pool；
- 401/403 只影响对应 Credential，不静默禁用整个 Provider。

## 3. Phase 2：RouteRule、编译快照和原子发布

### 目标

替换静态路由，在控制面编辑、模拟并发布确定性路由规则。

### 交付

- RouteRule、Matcher、RouteTarget、Patch 和 Snapshot 表；
- Exact / Prefix / Glob / Regex 确定性优先级；
- Client > Harness > Global Scope；
- 同协议保存前校验；
- 共享 `resolveRoute()`，运行时和 Explain 不复制逻辑；
- Snapshot Compiler、版本号和最后有效快照；
- DB Commit → Compile → Validate → Atomic Publish；
- 路由编辑器、匹配模拟和发布状态；
- Property Test、歧义拒绝和 Snapshot 回放。

### 验收

- 相同输入与 Snapshot 得到相同结果；
- 编译失败不替换最后有效快照；
- 热路径不查询控制配置表；
- Request 保存 Snapshot Version、Rule、Target、Endpoint 和 Credential ID；
- 首字节后不发生 Target 回退。

## 4. Phase 3：多凭据调度、冷却和保守回退

### 目标

支持同一账号或 Endpoint 的多个 API Key，并准确解释每次尝试。

### 交付

- Credential Scheduler；
- Round-robin / priority 等明确策略；
- 429 冷却、401/403 `auth_failed`、连接错误分类；
- Attempt Budget；
- 首字节前 Credential 切换和 RouteTarget 回退；
- 完整 Attempt Timeline；
- 并发、冷却恢复、取消和耗尽测试。

### 验收

- 重试不增加逻辑 Request 数；
- 最终成功可以包含失败 Attempt；
- 冷却状态与禁用状态分离；
- Provider Error、Gateway Error 和 Client Cancellation 分离统计；
- 不重复发送已产生下游副作用的流。

## 5. Phase 4：Responses 与 Anthropic Messages

### 目标

在不引入跨协议转换的前提下扩展第二、第三种数据面协议。

### 顺序

1. OpenAI Responses；
2. Anthropic Messages；
3. Codex 专用模型列表或兼容入口，仅在实际 Harness 需要时加入。

每个协议都必须拥有：

- 独立 Ingress Handler；
- 宽松请求提取；
- 原始流式 Fixture；
- 入口协议兼容 Gateway Error；
- Usage / TTFT Observer；
- 首字节前后失败矩阵；
- Keyless Mock Provider 黄金路径。

不得为了复用而建立统一消息 DTO。

## 6. Phase 5：Usage、价格和分析

### 目标

基于真实 Attempt 和历史价格快照提供可解释成本。

### 交付

- NormalizedUsage；
- Provider 原始 Usage 快照；
- PricingRule、PricingSnapshot 和来源优先级；
- Manual Override > 本地 Provider 数据 > models.dev 预填；
- Request 成本为所有 Attempt 成本之和；
- 小时/日聚合表；
- 按客户端、Provider、模型和错误类型分析；
- unknown / partial / subscription 明确状态；
- 分析页和导出。

### 验收

- 按实际上游模型和当时价格计算；
- 历史记录不受后续价格修改影响；
- 未知 Usage 或价格不显示为 0；
- Reasoning Token 不重复计费；
- 金额使用数据库 `numeric` 和 API string。

## 7. Phase 6：PayloadStore、保留策略和运维

### 目标

在默认保护隐私的前提下提供可选原始载荷诊断。

### 交付

- 本地私有目录 PayloadStore；
- 哈希、大小、截断、加密和保留元数据；
- 默认不保存完整 Prompt / Response；
- Retention Job；
- Backup / Restore；
- Credential Rotation、升级和事故诊断 Runbook；
- Docker Release、正式 License 和第三方许可证清单。

## 8. 每阶段共同门禁

- 当前文档与源码同 PR；
- 非平凡选择更新 Decision Note；
- Control API 变化更新 OpenAPI 与生成客户端；
- Schema 变化包含空库和升级 Migration 证据；
- 数据面变化包含协议 Fixture、取消和首字节边界；
- UI 变化包含 URL 状态、中文文案和浏览器证据；
- `pnpm check:docs`、受影响 Gate 和 Artifact Smoke 通过；
- 完成报告列出实际命令、未验证项和剩余风险。
