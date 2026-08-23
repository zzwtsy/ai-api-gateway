---
document_id: AIGW-PROVIDER-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Provider、Endpoint 与多账号设计

## 1. 为什么必须拆分

错误建模：

```text
Provider = Base URL + API Key
```

无法表达：

- 同一厂商多个协议入口；
- 同一厂商普通 API 与 Coding Plan 专属 Endpoint；
- 同一账号多个 API Key；
- 同一个 Key 可用于多个 Endpoint；
- 每个 Key 独立健康状态；
- 账号采用包月而非按 Token 计费。

正确结构：

```text
Provider
├── UpstreamEndpoint
└── ProviderAccount
    └── ProviderCredential

UpstreamEndpoint ← EndpointCredential → ProviderCredential
```

## 2. Provider 预设

内置预设只提供“初始建议”，不是永久硬编码：

- 厂商名称与图标；
- 常见 Endpoint Base URL 和路径；
- 鉴权方式；
- 支持的协议声明；
- models.dev Provider ID 候选；
- 文档链接；
- Probe 模板；
- 已知兼容性提示。

用户可以复制为自定义 Provider，但内置预设升级时不得覆盖用户修改。

## 3. Endpoint 配置

每个 Endpoint 必须明确：

```text
协议
Base URL
Request Path
Models Path（可选）
鉴权方式
流式支持
超时
Header / Query 默认值
Harness Compatibility
```

不允许用一个 `supports_responses: true` 概括整个 Provider。兼容性是 Endpoint + HarnessProfile 维度。

## 4. 账号和套餐

ProviderAccount 用于费用归因：

```text
DeepSeek 主账号        metered
智谱 Coding Plan       subscription
Kimi 测试账号          free
自定义中转             custom
```

Account 级字段可以保存：

- 套餐名称；
- 月度固定成本；
- 账期开始日；
- 额度说明；
- 账号标签；
- 费用归因模式。

MVP 不需要自动登录厂商后台获取账单。

## 5. Credential 生命周期

### 5.1 创建

1. UI 收集 Secret；
2. 服务端验证格式和重复 Fingerprint；
3. 使用主密钥加密；
4. 保存 Mask；
5. 状态设为 `unverified`；
6. 用户执行测试；
7. 成功后设为 `healthy`。

### 5.2 轮换

推荐流程：

```text
添加新 Key
→ 测试成功
→ 新 Key 加入同优先级池
→ 观察
→ 禁用旧 Key
→ 删除旧 Secret 或保留短期回滚
```

客户端无需修改 Gateway Key。

### 5.3 撤销

撤销后：

- 不再参与选择；
- 历史 Attempt 保留 Fingerprint/Mask 快照；
- 不保留明文；
- UI 显示撤销时间和最近使用时间。

## 6. Credential 状态机

```mermaid
stateDiagram-v2
  [*] --> Unverified
  Unverified --> Healthy: probe success
  Unverified --> AuthFailed: 401/403
  Healthy --> Cooldown: 429
  Healthy --> Unavailable: repeated transport/5xx
  Cooldown --> Healthy: cooldown expired + next success
  Cooldown --> AuthFailed: auth failure
  Unavailable --> Healthy: probe success
  AuthFailed --> Healthy: secret updated + probe success
  Healthy --> Disabled: manual
  Cooldown --> Disabled: manual
  AuthFailed --> Disabled: manual
  Disabled --> Unverified: manual enable
```

## 7. 健康度

MVP 不实现复杂综合评分。选择只依据：

- enabled；
- priority；
- status；
- cooldown_until；
- Round Robin。

UI 可以显示最近 24 小时：

- Attempt 数；
- 成功率；
- 429 率；
- P95 TTFT；
- 最近成功；
- 最近错误。

这些指标不自动改变 Credential 优先级，避免不可解释行为。

## 8. Circuit Breaker

Endpoint 级轻量 Circuit Breaker：

```text
closed
→ 连续 N 次 transport/5xx
open（短时不选）
→ cooldown 后 half_open
→ Probe 或真实请求成功后 closed
```

429 主要影响 Credential，不应默认打开整个 Endpoint，因为其他账号可能仍有额度。

推荐初始参数：

```text
consecutive_failures_to_open = 5
open_duration = 30s
half_open_max_attempts = 1
```

作为配置默认值，不是固定常量。

## 9. Provider Probe

Probe 分为：

### 9.1 Credential Probe

- 最小非流式请求；
- 验证鉴权；
- 使用指定低成本模型；
- 不自动循环所有模型。

### 9.2 Endpoint Probe

- 非流式基本请求；
- SSE 基本请求；
- Tool Call；
- Usage；
- Reasoning 参数；
- 结构化输出；
- 错误 Envelope。

### 9.3 Harness Probe

Codex：

- Responses SSE；
- Function Tool；
- `apply_patch`（若目标声称支持）；
- Reasoning Event；
- `/models` 目录兼容。

Claude Code：

- Anthropic Message；
- Tool Use/Result；
- Thinking；
- 多个 Claude 模型别名；
- 流式消息终态。

Probe 必须显式触发或受控定时，避免无意产生大量费用。

## 10. 多 Key 统计

每个 Attempt 保存：

```text
provider_id
endpoint_id
account_id
credential_id
credential_mask_snapshot
```

UI 默认按账号聚合，可下钻到 Credential。不要在 Dashboard 直接显示完整 Key 或过多 Key 级图表。

## 11. UI 映射

数据库实体在 UI 中组织为“连接”：

```text
连接详情
├── 概览
├── 接口
├── 账号
├── 模型
├── 兼容性
└── 高级设置
```

用户添加 API Key 时先选择账号；默认可在一个步骤中同时创建 Account + Credential，避免暴露底层复杂度。

## 12. 验收条件

- 一个 Provider 能配置三个不同协议 Endpoint；
- 一个 Account 能配置多个 Credential；
- 一个 Credential 能绑定多个 Endpoint；
- Coding Plan Key 可限制到专属 Endpoint；
- 429 只冷却当前 Credential；
- 401/403 不会永久污染整个 Provider；
- Credential Secret 不出现在日志、错误和导出；
- UI 能查看每个账号和 Key 的健康状态与使用量。
