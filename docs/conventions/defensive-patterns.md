---
document_id: AIGW-DEFENSIVE-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 防御性工程模式

这些规则用于固化已经识别的 Gateway 高风险缺陷类别。只有出现真实事故、近失误或明确的运行时关系时才新增规则；不要为推测性敌对对象制造无主防御代码。

## 1. 正交结果独立表达

一个 Attempt 可以同时是：Provider 返回 429、发生 Credential 切换、Request 最终成功、Usage 观测不完整。不得压缩成一个含糊 `status`。至少分开：

```text
providerOutcome
terminationReason
retryDecision
fallbackReason
observationStatus
finalRequestOutcome
```

## 2. 一个异步操作只有一个生命周期所有者

请求、Snapshot 发布、Observer Drain 和 Shutdown 各自应由一个 Controller 或事务拥有。多个 Promise、布尔标记和 Sentinel 表达同一完成事实时，应合并为一个 Settlement Point。

## 3. Shutdown 必须到达静止

调用 `abort()`、`close()` 或停止 Listener 不代表已经关闭。关闭序列必须等待：

```text
停止接收新请求
→ 当前请求完成或达到 Drain Deadline
→ Observer/Recorder 队列清空
→ 定时任务停止
→ Undici Pools 关闭
→ PostgreSQL Pool 关闭
```

并发 Shutdown 调用共享同一个 Promise，资源关闭只执行一次。

## 4. 回调异常由调度者隔离

Observer、事件订阅者或诊断 Hook 的异常不能破坏主流或阻止后续订阅者。捕获位置应在 Dispatcher，并记录结构化错误；不能要求每个调用方自行包裹。

## 5. 限制作用于完整结果

大小、条目、时间和 Token 限制必须在完整保留或发出的值已知的位置执行，包括 Envelope、Metadata 和编码膨胀。测试至少覆盖：

- 极小和恰好等于限制；
- 单个 Chunk 已超限；
- 多个 Chunk 累计超限；
- UTF-8 多字节字符跨 Chunk；
- Wrapper 加入后超限。

## 6. 客户端取消与内部失败分离

Client Disconnect 必须传播到上游 AbortSignal，但不能统计为 Provider 5xx。Observer 降级也不能把已经成功的请求改成失败。

## 7. Secret 不进入环境外溢路径

日志、错误、Fixture、Snapshot、诊断包和临时文件都按不可信输出处理。需要落盘的临时载荷使用私有目录、随机文件名和仅所有者权限；默认环境不得原样交给外部子进程。

## 8. 在做决定的位置强制规则

Route Schema、UI 隐藏或外围 Facade 不能替代执行点约束。协议一致性在 Resolver/Handler 出站前断言，Header 隔离在 Transport 前断言，状态发布在 Repository/Snapshot Publisher 的 Commit Point 断言。
