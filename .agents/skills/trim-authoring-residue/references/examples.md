# 作者过程残留改写示例

## PR 视角改为已交付机制

差：

```text
这个 PR 增加了首字节后的回退保护。
```

好：

```text
下游收到首个上游字节后，RouteTarget 固定；后续上游错误只结束当前 Attempt，不触发回退。
```

## 评审过程改为技术依据

差：

```ts
// Reviewer 要求在这里复制对象。
```

好：

```ts
// Snapshot 发布后可能被多个请求并发读取；发布前冻结，发布后不再暴露可变引用。
```

若真实合同是同进程只读借用，不应为了保留注释而编造复制需求。

## 变更历史改为现在时反事实

差：

```ts
// 以前这里会把 Client Cancel 记成 Provider 500。
```

好：

```ts
// Client Cancel 单独终止 Request；不得计入 Provider 失败率。
```

需要解释 Guard 时：

```ts
// 若在 Provider 分类前不检查 Client Abort，取消会污染 Provider 失败率。
```

## 控制流讲解：删除或写成时序合同

差：

```ts
// 先保存 Attempt，再更新 Request，然后通知订阅者。
```

好：

```ts
// 订阅者只能在 Attempt 与 Request 终态同时可读后收到通知。
```

## 含糊计划改为真实边界

差：

```ts
// 这个队列大小暂时应该够用。
```

好：

```ts
// 队列最多保留 256 个 Observation；超限时丢弃诊断并标记 observationStatus=incomplete，不阻塞响应流。
```

若没有已接受边界，使用有所有者的 Issue/TODO，而不是猜测数字。

## 内部编号改为可解析引用

差：

```text
按照 decision 7，价格快照在 Attempt 创建时确定。
```

好：

```text
价格快照在 Attempt 创建时确定，避免后续价格目录变化重写历史成本。长期取舍见对应的已提交 Decision Note。
```

只有存在真实文件时才添加 Markdown 链接。

## 合法的运行时 old/new 状态

保留：

```text
旧连接完成 Drain 后，新连接才接收请求。
```

这里的“旧/新”描述同一时刻的运行时对象，不是仓库版本历史。

## 合法的测量依据

保留：

```text
批量上限为 500 条；在目标硬件上测得该批次使事务时间保持在 200 ms 内。
```

“测得”提供常量依据，不是作者过程噪声。测量环境若影响结论，应同时记录。

## 合法的 Decision 替代方案

保留在 Decision：

```text
Alternatives considered：使用 Provider SDK 重建请求；放弃，因为未知字段和原始 Streaming 字节无法得到同等保证。
```

不要把这段复制到每个 Handler 注释中；局部只保留必须遵守的合同并链接 Decision。
