---
document_id: AIGW-EXEC-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 执行摘要

## 1. 背景

AI 编码 Harness 通常允许配置自定义 Base URL 和 API Key，但不同厂商对 OpenAI Chat Completions、OpenAI Responses、Anthropic Messages 的支持范围并不一致。同一模型在不同厂商 Endpoint 上的能力、字段、流式事件、价格和稳定性也可能不同。用户为了切换厂商，需要反复修改 Codex、Claude Code、Pi 等工具的配置，并且很难统一回答以下问题：

- 哪个 Harness 实际使用了哪个上游模型？
- 同一厂商多个账号中，某次请求使用了哪个 API Key？
- 错误是最终请求失败，还是主账号 429 后已通过备用账号成功？
- 请求的真实成本是多少？价格来自哪里？
- 某个 Endpoint 声称兼容协议，但哪些字段被忽略？

## 2. 解决方案

系统提供多个稳定入口：

```text
/openai/v1/chat/completions
/openai/v1/responses
/anthropic/v1/messages
/codex/responses
/codex/models
```

每个 Harness 实例使用独立的 Gateway API Key。Gateway 根据客户端身份、入口协议和请求模型匹配确定性路由规则，在**相同协议**下选择具体的厂商 Endpoint、模型和上游 Credential，并进行最小修改：

- 替换客户端 Gateway Key 为上游鉴权；
- 将请求模型别名改写为上游真实模型 ID；
- 按配置添加 Header、Query 或有限 Body Patch；
- 保留其他未知字段和原始协议语义；
- 对流式响应进行字节透传，同时旁路解析指标。

## 3. 核心边界

系统不做：

- Chat Completions、Responses、Anthropic Messages 之间的转换；
- 视觉、音频或工具能力驱动的自动切模型；
- 多模型编排和能力补充；
- 服务端会话模拟和 `previous_response_id` 补偿；
- 对上游不支持字段进行静默修复；
- 企业多租户、组织、RBAC、对外售卖与充值；
- 移动端 UI。

## 4. 核心实体

```text
GatewayClient       Harness 的一个具体实例
GatewayClientKey    Harness 使用的 Gateway API Key
HarnessProfile      Codex / Claude Code / Pi 等行为模板
Provider            DeepSeek / 智谱 / Kimi 等厂商
UpstreamEndpoint    某厂商某一协议的具体入口
ProviderAccount     厂商账号或套餐身份
ProviderCredential  可解密的上游 API Key
ProviderModelBinding 某 Endpoint 上可调用的模型
RouteRule           客户端、协议、请求模型的匹配规则
RouteTarget         按顺序排列的上游目标
Request             用户视角的一次逻辑请求
Attempt             Gateway 对上游的一次真实调用
PricingSnapshot     Attempt 发生时使用的价格快照
```

## 5. 关键算法

路由优先级固定为：

```text
客户端专属 > Harness 专属 > 全局
精确匹配 > 前缀匹配 > Glob > 正则
显式优先级高 > 模式更长 > 创建时间更早
```

Credential 选择：

```text
最高可用优先级组
→ 同组 Round Robin
→ 排除禁用、鉴权失败和冷却中的 Key
```

默认重试与回退：

- 429：当前 Credential 冷却，尝试同 Endpoint 下一个 Credential；
- 401/403：标记 Credential 鉴权失败，可尝试同 Endpoint 其他 Credential；
- 连接失败、明确 5xx：可进入下一个 RouteTarget；
- 400 或确定性参数错误：不重试；
- 已向客户端发送响应首字节：不再切换 Credential 或 RouteTarget；
- 每个逻辑请求默认最多 2 个 Gateway Attempt。

## 6. 可观测性

系统分别统计 Request 和 Attempt：

- Request 错误率：最终失败的逻辑请求比例；
- Attempt 错误率：上游调用失败比例；
- 回退率：发生两个及以上 Attempt 的请求比例；
- 429 率、鉴权错误率、流中断率、客户端取消率；
- P50/P95/P99 TTFT 和总延迟；
- 按 Harness、客户端、厂商、Endpoint、账号、Credential、模型、协议聚合。

## 7. 模型与价格

models.dev 仅用于预填：

```text
用户手动覆盖
> Endpoint / 账号专属覆盖
> 本地 Probe 结果
> models.dev Provider Model
> models.dev Base Model
> unknown
```

系统按照实际上游模型和 Attempt 计算费用。历史 Attempt 保存价格快照，后续价格同步不得改写历史成本。未知价格必须显示 `unknown`，不能按 0 计算。

## 8. Web UI

Web UI 只面向桌面端，主要导航为：

```text
监控：概览、请求、分析
配置：连接、模型、路由、客户端
系统：设置
```

UI 以“连接厂商、配置路由、接入工具、查看请求、分析使用”为用户语言，避免直接暴露数据库实体。通过厂商预设、向导、路由预览、匹配模拟、兼容性提示和 Harness 配置生成器降低认知成本。

## 9. MVP 成功标准

MVP 完成的最低条件：

1. 三种协议入口可进行透明代理和 SSE 透传。
2. 能通过独立 Gateway Client Key 识别不同 Harness。
3. 能配置同厂商多个账号和 API Key。
4. 能执行确定性模型映射和同协议回退。
5. Request 与 Attempt 日志完整可查。
6. 能统计 Token、成本、错误率、回退率、TTFT 和延迟。
7. 能使用 models.dev 预填并允许字段级覆盖。
8. Web UI 能完成连接、模型、路由、客户端和请求排障的完整闭环。
