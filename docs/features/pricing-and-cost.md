---
document_id: AIGW-COST-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 价格与成本设计

## 1. 成本对象

价格绑定到：

```text
ProviderModelBinding
+ 可选 Account/Endpoint 覆盖
+ 生效时间范围
```

成本计算发生在 Attempt，不直接发生在 RouteRule 或请求别名。

客户端请求 `gpt-5.4`，实际发送 `deepseek-v4-flash` 时，使用实际上游 Binding 的价格。

## 2. 三种成本

### 2.1 API-equivalent Cost

按公开 Token 单价估算的 API 价值，适合比较不同 Harness 使用量。

### 2.2 Estimated Billed Cost

根据账号计费模式估算的实际边际费用。

### 2.3 Reported Cost

厂商响应或账单接口明确报告的费用。

UI 必须明确区分，不能把包月套餐中的 API-equivalent Cost 显示为实际已扣款。

## 3. Billing Mode

```text
metered       按 Token 或工具调用计费
subscription  固定套餐，边际成本可能为 0
free          免费额度/免费服务
custom        用户自定义计算规则
unknown       无法确定
```

MVP 处理：

- metered：计算 Estimated Billed Cost；
- subscription：显示 API-equivalent Cost，Billed Cost 标记 `included_in_subscription`；
- free：Billed Cost = 0，但保留 API-equivalent Cost；
- unknown：成本状态 unknown。

## 4. PricingRule

关键字段：

```text
provider_model_binding_id
account_id                 可空
endpoint_id                可空
currency                   默认 USD
unit                       per_million_tokens
input_rate
output_rate
reasoning_rate
cache_read_rate
cache_write_rate
audio_input_rate
audio_output_rate
tool_rates_json
long_context_rules_json
valid_from
valid_to
source
source_version
priority
```

更具体的 Account Rule 优先于通用 Binding Rule。

## 5. 价格匹配

```text
1. Attempt.account + endpoint + model 精确 Rule
2. Attempt.account + model Rule
3. Endpoint + model Rule
4. ProviderModelBinding Rule
5. models.dev 预填 Rule
6. unknown
```

生效时间必须覆盖 Attempt.started_at。

## 6. Token 公式

标准文本计费：

```text
cost =
  input_tokens      × input_rate      / 1_000_000
+ output_tokens     × output_rate     / 1_000_000
+ reasoning_tokens  × reasoning_rate  / 1_000_000
+ cache_read_tokens × cache_read_rate / 1_000_000
+ cache_write_tokens× cache_write_rate/ 1_000_000
```

避免重复计费：如果厂商的 `output_tokens` 已包含 reasoning tokens，则 PricingRule 必须标明 `reasoning_included_in_output = true`，不能再次相加。

## 7. Usage 不完整

CostResult 状态：

```text
reported
calculated
estimated
partial
unknown
included_in_subscription
free
```

情形：

- 失败 Attempt 无 Usage：unknown；
- 只有 total tokens：可 partial/estimated，不随意拆分；
- 流被取消前无最终 Usage：unknown 或 provider-specific estimated；
- 价格未知：unknown；
- 某维 Token 存在但对应 Rate 缺失：partial。

未知不能按 0 计入总费用。Dashboard 应同时显示“已知费用”和“未知费用请求数”。

## 8. Request 总成本

```text
Request API-equivalent Cost = Σ Attempt API-equivalent Cost
Request Billed Cost = Σ Attempt Billed Cost
```

失败 Attempt 可能产生费用，不能只统计最终成功 Attempt。

## 9. PricingSnapshot

每个 Attempt 完成时保存实际使用的价格：

```json
{
  "currency": "USD",
  "unit": "per_million_tokens",
  "inputRate": 1.2,
  "outputRate": 4.8,
  "cacheReadRate": 0.12,
  "source": "models_dev",
  "sourceVersion": "sha256:...",
  "capturedAt": "2026-08-20T00:00:00Z"
}
```

后续 PricingRule 更新不得修改该 Snapshot。

## 10. 汇率

权威成本保存原始货币。UI 可按用户设置显示换算值：

```text
original_currency
original_cost
display_currency
exchange_rate
exchange_rate_date
converted_cost
```

MVP 可只保存 USD 原价并提供固定手动汇率；不要依赖实时汇率才能完成请求。

## 11. 工具和额外计费

模型价格不一定只有 Token：

```text
web_search call
file_search
container/code execution
image generation
storage
long context surcharge
provider markup
```

MVP 允许 `tool_rates_json` 和 `raw_billing_details`，即使尚未自动计算，也不丢失上游报告字段。

## 12. 价格 UI

模型详情显示：

```text
公开参考价
账号覆盖价
最终生效价
来源
更新时间
生效日期
```

分析页显示：

```text
API 参考价值
预计实际费用
厂商报告费用
未知费用请求数
```

## 13. 价格变更

同步发现变化时：

```text
旧价格
新价格
来源
生效日期（若未知则从应用时间开始）
受影响的新请求
```

用户可：

- 应用新值；
- 保留当前；
- 创建未来生效 Rule；
- 手动覆盖。

## 14. 验收条件

- 按实际上游模型计费；
- Request 汇总所有 Attempt；
- 历史费用不受价格同步影响；
- 包月显示参考价值而非虚假扣费；
- 未知价格不按 0；
- 缓存 Token 使用独立费率；
- Reasoning 不重复计费；
- UI 能追溯价格来源。
