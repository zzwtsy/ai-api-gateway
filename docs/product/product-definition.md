---
document_id: AIGW-PROD-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 产品定义

## 1. 产品陈述

AI API Gateway 是一个面向个人使用、自托管、只针对桌面 Web 的多厂商 AI API Gateway。它让 Codex、Claude Code、Pi 等 Harness 使用固定的 Gateway 地址和独立 API Key，在不改变入口协议的前提下，将模型请求映射到同协议的上游厂商 Endpoint、模型、账号和 Credential，并提供统一的配置、监控、价格和故障分析界面。

## 2. 目标用户

主要用户只有系统所有者本人，典型特征：

- 同时使用多个 AI 编码 Harness；
- 拥有多个厂商账号、套餐或中转服务；
- 经常测试不同模型；
- 需要统计不同 Harness 的成本、稳定性和性能；
- 希望使用 Web UI 配置，而不是频繁维护多个 TOML、JSON 和环境变量；
- 愿意自托管单机服务，但不希望维护复杂分布式基础设施。

## 3. 核心用户任务

### 3.1 接入 Harness

用户创建一个客户端，例如 `Codex - Arch`，系统生成一个 Gateway API Key 和可复制配置。该客户端只允许使用预设的协议与路由范围，并且其所有使用量可独立分析。

### 3.2 连接厂商

用户选择 DeepSeek、智谱、Kimi 或自定义 Provider 预设，填写一个或多个 API Key。系统测试 Endpoint、发现模型、预填元数据，并显示兼容性状态。

### 3.3 配置模型映射

用户用自然语言式表单定义：

```text
当 Codex 通过 Responses 请求 gpt-5.4 时，
发送到 DeepSeek Responses 的 deepseek-v4-flash，
优先使用主账号，429 时切换备用账号，
最多进行 2 次 Gateway Attempt。
```

### 3.4 排查请求

用户通过请求 ID、客户端、模型或状态筛选请求，查看：

- 请求匹配了哪条路由；
- 实际上游模型；
- 使用的账号和 Credential；
- 每个 Attempt 的状态和耗时；
- Token、成本和兼容性警告；
- 是否发生回退、429、流中断或客户端取消。

### 3.5 分析使用情况

用户可以按时间、Harness、客户端、Provider、Endpoint、账号、Credential 和模型比较请求量、错误率、回退率、TTFT、延迟、Token 和费用。

## 4. 产品价值

### 4.1 配置稳定

Harness 只需配置一次 Gateway 地址。更换上游厂商、模型或 API Key 不再修改 Harness 本地配置。

### 4.2 行为可解释

任何模型替换、Credential 切换和 RouteTarget 回退都可在 UI 中解释。系统不进行用户不可见的能力编排。

### 4.3 统计可归因

Gateway Client Key 是准确的客户端身份来源；不依赖 User-Agent 或 IP 猜测 Harness。

### 4.4 降低维护成本

厂商预设、models.dev 预填、Endpoint Probe、配置生成器和清晰的 UI 状态减少手工录入和排障成本。

## 5. 用户体验原则

1. **先给结果，再给内部结构。** 页面先回答“是否正常、请求去哪、为何失败”，再展示实体关系。
2. **基础配置默认可完成任务。** Base URL、Header、Query、Body Patch 等放入高级设置。
3. **不隐藏关键行为。** 模型名和账号发生替换时必须可见。
4. **错误包含影响和处理建议。** 不只显示 `partial compatibility` 或 `429`。
5. **高风险操作显式保存。** API Key、路由、价格、日志策略不自动保存。
6. **桌面高密度但不拥挤。** 以表格、分栏和详情检查器为主，不进行移动端卡片化。

## 6. 非功能目标

以下为设计目标，实施时应通过基准测试修正：

- Gateway 在本地网络、关闭 Raw Payload 记录时，对 TTFT 的附加 P95 延迟目标不超过 20ms；
- 流式代理每连接只保留有界缓冲区，禁止缓存完整响应后再发送；
- 客户端断开后应尽快取消上游请求；
- 任何 Secret 不得以明文出现在日志、错误或导出文件；
- 单实例可以支撑个人使用的并发 Harness 会话；
- 控制面异常不得破坏正在进行的数据面请求；
- models.dev 和 Probe 失败时，现有路由仍可继续使用。

## 7. 成功指标

- 首次接入一个厂商和一个 Harness，在默认向导中完成；
- 用户可以在 30 秒内回答“刚才 Codex 为什么失败”；
- 用户可以区分 Request 错误率和 Attempt 错误率；
- 用户可以看到某个 Harness 的成本与实际目标模型；
- 用户可以安全轮换上游 API Key，而不修改 Harness；
- 升级厂商兼容性信息不会覆盖本地手动配置。
