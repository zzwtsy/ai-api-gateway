---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 产品 UX 合同

## 1. 用户与使用环境

主要用户是系统所有者本人。他同时使用多个 AI Harness、多个厂商账号和多个 API Key，需要在一个本地控制面中完成配置、观测、排障和成本分析。

设计不是面向企业管理员、团队协作或公开 SaaS。默认假设：

- 单用户；
- 自托管；
- 桌面浏览器；
- 用户理解模型、API、Token、Endpoint 等基本概念，但不应被迫理解全部内部实体；
- 高频任务是查看请求、定位失败、调整连接与路由，而不是维护数据库记录。

## 2. 核心任务

前端必须让用户完成以下闭环：

```text
连接上游厂商
→ 确认 Endpoint 与账号可用
→ 绑定可路由模型
→ 定义同协议路由
→ 创建 Harness 客户端与 Gateway Key
→ 发送测试请求
→ 在请求页解释实际路由、Credential 与 Attempt
→ 在分析页比较成本与稳定性
```

## 3. 用户心智模型

界面只把以下五类对象作为一级心智模型：

| 对象 | 用户理解 | 内部实现可包含但默认隐藏的实体 |
| --- | --- | --- |
| 连接 | 一个厂商及其 Endpoint、账号和 API Key | Provider、Endpoint、Account、Credential |
| 模型 | 某 Endpoint 上真实可调用的上游模型 | Model Binding、Capability Snapshot、Pricing Rule |
| 路由 | 什么请求发送到哪个同协议目标 | RouteRule、RouteTarget、Matcher、Snapshot |
| 客户端 | 一个具体 Harness 实例及其 Gateway Key | GatewayClient、GatewayClientKey、HarnessProfile |
| 请求 | 一次逻辑调用及其上游尝试链 | Request、Attempt、Usage、PricingSnapshot |

内部术语只在高级详情、诊断或 Tooltip 中出现，不能成为完成普通任务的前置知识。

## 4. 不可破坏的产品语义

### 4.1 协议保持

OpenAI Chat Completions、OpenAI Responses、Anthropic Messages 是不同协议边界。路由目标必须与入口协议一致。

界面必须：

- 在选择目标时过滤掉不同协议 Endpoint；
- 在保存前再次校验；
- 在路由预览和请求详情中明确显示“协议一致”；
- 不提供跨协议转换开关；
- 不暗示 Gateway 会自动改写 `messages`、`input`、`tools` 或会话语义。

### 4.2 Request 与 Attempt 分离

`Request` 是客户端视角的一次逻辑请求；`Attempt` 是 Gateway 对上游的一次真实调用。两者必须分开统计和展示。

禁止：

- 把重试计为新的逻辑请求；
- 用 Attempt 错误率代替最终请求错误率；
- 只展示最终 200 而隐藏此前的 429、401、连接失败或回退；
- 在请求列表里将多个 Attempt 展开成多行并伪装成多个请求。

### 4.3 两类 Secret 分离

Gateway Client Key 用于识别 Harness；Provider Credential 用于访问上游。二者用途、生命周期、日志和操作入口必须分离。

完整 Secret 只允许在创建或轮换完成页显示一次。列表、日志、导出、截图和诊断包始终脱敏。

### 4.4 `unknown` 不等于 `0`

价格未知、Usage 不完整、能力未验证等状态必须显式显示为 `unknown`、`未验证` 或 `参考值`。不得把未知费用并入 US$0，也不得用绿色“正常”掩盖未验证状态。

### 4.5 确定性与可解释性

用户必须能够回答：

- 哪条规则命中；
- 为什么它优先于其他规则；
- 目标模型如何映射；
- 使用了哪个 Endpoint、账号和 Credential；
- 是否发生 Credential 切换或 RouteTarget 回退；
- Gateway 实际修改了哪些字段；
- 下一步应检查什么。

## 5. 设计目标

1. **30 秒内完成请求解释。** 打开请求后，不阅读原始 JSON 也能理解最终结果、根因和恢复动作。
2. **配置时预防错误。** 协议不一致、悬空引用、不可用 Credential 和非法 Patch 在保存前被阻断。
3. **默认低认知负担。** 页面先显示用户任务和结果，高级内部结构后置。
4. **高信息密度但不拥挤。** 表格、分栏和详情检查器优先；避免卡片网格化后台。
5. **状态语言准确。** “正常、回退、冷却、未知、未验证、最终失败”不能互相替代。
6. **操作有明确边界。** 全局动作、页面动作、行级动作和高风险动作分层。

## 6. 非目标

前端不设计以下能力：

- 企业多租户、组织、RBAC、审批流；
- 面向手机的完整控制面；
- 视觉路由、自动选模、能力编排；
- 跨协议转换；
- 节点连线式路由画布；
- 以营销大屏、彩色渐变或装饰图形为核心的视觉表达。
