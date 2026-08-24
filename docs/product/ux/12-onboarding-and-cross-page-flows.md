---
status: normative
last_reviewed_at: 2026-08-24
language: zh-CN
---

# 首次设置与跨页流程

## 1. 首次运行原则

首次运行不展示充满 0 的常规概览。应显示一个轻量 Setup Checklist，同时保留主导航，让用户知道系统最终结构。

## 2. 推荐流程

```text
1. 添加连接
2. Probe Endpoint 与账号
3. 确认或添加模型绑定
4. 创建同协议路由
5. 创建客户端并复制 Gateway Key
6. 应用 Harness 配置
7. 发送测试请求
8. 打开刚生成的 Request 与 Attempt
```

每一步都应提供“继续下一步”，并保留返回修改的能力。

## 3. 添加连接

选择 Provider 预设或自定义。默认只要求：名称、API Key、协议 Endpoint。Base URL、Header、Query、Patch 后置到高级。

创建后立即执行 Probe，并在结果中区分：鉴权、基础请求、流式、Usage、字段兼容性。

## 4. 模型确认

Probe 或 Provider API 发现模型后，预填模型绑定。用户确认请求别名、能力、上下文和价格来源。发现失败时允许手动添加，不阻断后续流程。

## 5. 创建路由

从已确认的协议和模型进入路由编辑器，预填首选目标。保存前运行匹配模拟。

## 6. 创建客户端

选择 Harness 和协议，生成 Key 与配置。配置只使用 Gateway Base URL 和 Gateway Client Key，不暴露上游 Credential。

## 7. 测试与验证

完成页发送测试请求，成功后直接进入该 Request 的 Inspector。用户应看到：

- Gateway Client Key 已识别客户端；
- 路由命中；
- 目标模型；
- Credential；
- Attempt；
- 响应结果。

这一步是首次设置完成的定义，不以“配置已保存”作为完成标准。

## 8. 中断与恢复

Setup Checklist 状态持久化。用户关闭页面后可从概览继续。已经保存的对象不重复创建；未提交 Secret 不持久化。

## 9. 跨页上下文

跨页按钮必须携带对象 ID 与目标 Tab，例如：

- 请求 → `connections?provider=deepseek&tab=accounts`；
- 模型 → `routes?model=deepseek-v4-pro`；
- 客户端 → `requests?client=client_id`；
- 概览 Attention → 对应 Request、Provider 或分析筛选。

## 10. 当前交付

当前概览以服务器中的连接和 Gateway Client 对象派生三步起步向导：缺少任一类对象时显示，两者都存在时隐藏，历史请求不参与判断。向导通过普通页面导航进入连接、模型和客户端创建入口，不维护第二份 Local Storage 或全局 Store 进度。

连接创建支持 Provider 预设填充。客户端创建完成态支持一次性 Harness 配置片段；客户端详情可由 `clientId` URL 状态恢复，并提供无 Secret 模板或通过显式 Key 轮换重新生成一次性完整配置。

连接详情同时提供一次最小 Credential 测试和显式完整兼容性 Probe。完整 Probe 的 Run、进度与模型级事实保存在服务端，关闭 Sheet 或刷新页面后可从兼容性 Tab 恢复；连接创建完成后尚未自动启动该任务。模型绑定表单可显式读取 OpenAI-compatible 上游模型目录，但耐久自动同步、路由编辑、跨页直接打开创建 Sheet、测试请求闭环和可恢复的持久 Checklist 仍属于后续交付。
