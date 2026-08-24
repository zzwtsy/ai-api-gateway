---
document_id: AIGW-INVARIANTS-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 运行时不变量所有权

## 1. 不变量不是接口存在性

运行时不变量必须断言两个或多个权威事实之间的关系，而不是检查“某个方法存在”或“某个类能够实例化”。例如：

```text
RouteTarget.protocol = ingress protocol
Attempt.requestId = Request.id
TTFT <= latency
客户端 Cookie 不进入 Upstream Headers
Shutdown 的所有并发调用共享一次静止过程
```

只验证对象字段存在、固定样例或测试专用元数据，不构成运行时不变量。

## 2. 所有者合同

每个高风险模块的不变量包含四部分：

```text
source      不变量实现
consumer    真正做出决定或发布状态的生产调用点
test        正常与非法关系的负向测试
manifest    仓库级所有权登记
```

登记文件为：

```text
scripts/verify/runtime-invariants.json
```

`pnpm verify:runtime-invariants` 会拒绝：

- 缺失 Source/Test/Consumer；
- 重复所有者；
- Source 未导出登记符号；
- Test 没有触及登记符号；
- Consumer 没有实际调用登记符号。

## 3. 当前拥有的不变量

| 所有者 | 关系 |
| --- | --- |
| Routing | 请求模型所有权、协议一致、Snapshot Version、Origin/Path 合法性 |
| Transport | Origin/Path、AbortSignal、Header 隔离 |
| Recording | Request/Attempt 身份、模型、序号、时间和终态指标 |
| Observation | Buffer 上限和 `complete/incomplete` 语义 |
| Compatibility Probe Resource Shutdown | 后台 Probe 先中止并 Settlement，再关闭其 Transport 与 Storage |
| Shutdown | 停止接收新请求后，只执行一次资源关闭并等待真正完成 |

后续新增 Credential Scheduler、Snapshot Publisher、Pricing 和 PayloadStore 时，应为它们增加自己的关系不变量，而不是把所有检查堆进一个全局 Validator。

## 4. 上游影响必须可记录

项目采用：

> **Upstream-affecting ⇔ Recorded**

凡是影响实际上游请求的决定，都必须能从 Request/Attempt 和对应 Snapshot 重建：

- 入口协议和请求模型；
- Routing Snapshot Version；
- 命中的 Rule/Target；
- Endpoint、Account 和 Credential ID；
- 实际上游模型；
- Header 或 Body Patch；
- Retry、Credential 切换和 Fallback 原因；
- 终止原因和观测完整性。

完整 Secret 不属于可记录事实，只记录安全 ID、Mask 和决策原因。

## 5. 状态发布点

配置和派生状态只能在自己的 Commit Point 发布：

```text
DB transaction commit
→ compile complete snapshot
→ validate invariants
→ atomic replace
→ emit published event
```

编译、验证或发布失败时继续使用最后有效 Snapshot。不能先更新内存的一部分，再依赖后续步骤“最终补齐”。

## 6. 不变量变更规则

- 修改关系语义必须更新对应 Decision Note；
- 新增不变量必须先证明非法情况会让测试或 Gate 失败；
- 删除不变量必须证明其关系已不存在、被更强所有者覆盖或没有生产消费者；
- 禁止通过空 Consumer、仅注释调用或全局跳过测试满足所有权清单。
