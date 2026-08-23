---
name: code-review
description: 在审查 ai-api-gateway 的 PR、分支或工作区改动时使用；基于实时 Base/Head、项目不变量、真实消费者和最小充分证据，审查正确性、生命周期、安全、协议、发布入口与文档同步。
---

# 代码审查

本 Skill 是语义审查工作流，不替代 [`ai/review-checklist.md`](../../../ai/review-checklist.md)，也不把自动 Gate 的绿色结果当成正确性证明。优先发现会破坏行为、生命周期、安全、协议或真实交付入口的问题；一个有充分证据的阻断项比一组风格建议更有价值。

审查任务默认只报告，不修改代码。只有用户明确要求修复时才实施，并转入相应 Feature、数据面、文档或证据 Skill。

## 事实来源

- [根 Agent 工作指南](../../../AGENTS.md)
- [Code Review Checklist](../../../ai/review-checklist.md)
- [变更证据矩阵](../../../ai/change-evidence-matrix.md)
- [变更范围与证据选择](../../../docs/conventions/change-scope-and-evidence.md)
- [质量门禁与验证证据](../../../docs/conventions/quality-gates-and-evidence.md)
- [防御性工程模式](../../../docs/conventions/defensive-patterns.md)
- [文档与文字审查](../documentation-review/SKILL.md)

还必须读取受影响目录最近的 `AGENTS.md`、拥有该行为的源码、最近测试、Feature/Convention 和现行 Decision Note。不要无差别读取整个仓库。

## 建立实时审查范围

1. 从当前 PR、分支关系或用户要求确认 Base；脚本不会也不应猜测 Base。
2. 确认正在审查的精确 Head。审查远端 PR 时先获取实时 Head，并避免把旧 Commit 的结论当作当前证据。
3. 检查工作树并生成范围报告：

```bash
git status --short --branch
git rev-parse --show-toplevel HEAD
pnpm change-scope --base <confirmed-base> --head <confirmed-head>
pnpm evidence:select --base <confirmed-base>
```

4. PR Retarget、Base Merge、Rebase 或新的 Push 会使旧范围失效；重新确认 Base/Head，并只重跑被新范围影响的审查与证据。
5. 范围报告用于发现路径和风险表面，不替代阅读 Diff、拥有代码和真实消费者。

## 先理解意图，再检查实现

为每个行为变化建立最小合同：

- 谁是调用者、生产者、消费者和生命周期所有者；
- 输入、输出、错误、取消、时序与持久化语义；
- 哪些字段、字节、Header、ID 或状态属于兼容表面；
- 哪个真实入口会交付该行为；
- 哪个测试或外部观察会为目标回归变红。

变更描述、Decision Note 和测试都不是绝对事实。用当前源码、运行路径和外部可观察结果交叉核对。

## 语义审查

### 范围、架构与必要性

- 是否越过当前产品范围，引入协议转换、能力路由、多租户、插件运行时或推测性基础设施；
- 是否改变长期边界却没有 proposed Decision Note；
- 新公开 API、Workspace Package、Repository、Port、Registry 或状态机是否有真实生产消费者；
- data-plane 是否反向依赖 control-plane，Feature 是否绕过既定依赖边界；
- Import 是否产生 Server、DB Pool、Timer 或网络副作用；
- 一个消费者专属能力是否被错误扩张成通用公开接口。

### 接口两端与状态所有权

- 同时跟踪接口的生产者和消费者，不只检查类型是否通过；
- `Endpoint`/`Provider`、`Account`/`Credential`、`Request`/`Attempt` 是否被混用；
- 借用值、拥有值、缓存、投影和耐久快照是否有明确权威来源；
- `unknown`、无数据和 `0` 是否仍保持不同语义；
- 保留或派生的状态是否在正确 Commit Point 发布，并通知所有需要的视图。

### 生命周期与并发

- 每个异步操作是否只有一个生命周期所有者和 Settlement Point；
- Abort 是否穿过所有 `await`、Transport、Observer、Recorder 和 Shutdown 边界；
- 回调异常是否由调度者隔离，是否会阻断主流或后续订阅者；
- 取消、错误、Retry、Fallback、Observation 和最终结果是否被压缩为一个含糊状态；
- Cleanup 是否完整且幂等；Shutdown 是否等待 Socket、Timer、队列、Pool 和写入任务静止；
- 限制是否作用于完整结果，包括 Wrapper、Metadata、编码膨胀和 UTF-8 多字节边界。

### 数据面与协议

- 入口协议是否保持，不做跨协议转换；
- 未知 Provider 字段是否原样保留，是否被不完整 DTO 或 SDK 重建丢失；
- SSE/Streaming 是否保留原始字节与 Chunk 语义，而不是通过 `streamSSE()`、`clone()` 或长期 `tee()` 重建；
- Hop-by-hop、Provider Credential 和 Gateway Client Key 是否正确隔离；
- Client Disconnect 是否真实终止上游，并与 Provider 失败分类分离；
- Observer 是否有界、不阻塞主流，降级是否不会改写已经成功的请求；
- 下游收到首个上游字节后是否绝不切换 RouteTarget；
- Retry/Fallback 是否受 Attempt Budget、协议一致性和首字节边界约束。

### 控制面、数据库与生成链

- Hono Route 是否通过既定 `createRoute` Golden Path 定义，Route 与 Handler 类型是否关联；
- `operationId`、Error Code、Example 和公开 Zod Schema 是否准确；
- OpenAPI、`apps/web/src/api/schema.d.ts` 和调用方是否同步；
- Drizzle Schema、SQL Migration、Journal/Snapshot、回填和 Upgrade Test 是否同步；
- 流式请求是否错误持有长事务；
- 生成物是否由拥有源重新生成，而不是手工修改。

### 安全、Secret 与不可信输出

- 完整 Secret 是否可能进入普通对象、日志、Error、API 响应、Fixture、Snapshot、截图、Trace、Video、导出或临时文件；
- 数据库是否只保存允许的哈希、密文或安全引用；
- Header Allowlist、SSRF、TLS、文件权限、CSRF 和 Session 边界是否在真正执行决策的位置强制；
- 错误和诊断是否泄露 Provider Credential、Gateway Key、用户 Prompt 或 Cookie；
- 负向测试是否覆盖 Dump、Log、Export 和浏览器证据表面。

### UI、可观测性与价格

- Loading、Empty、Error、Stale、Partial 和 `unknown` 状态是否可区分；
- 高风险操作是否显式保存，状态是否不只靠颜色表达；
- URL 筛选和详情状态是否可恢复，键盘与 ARIA 是否可用；
- Web 是否只消费生成的 Admin OpenAPI Client，而不是复制服务端状态或手写 DTO；
- Request 与所有 Attempt、HTTP 与语义状态、Client Cancel 与 Provider Error 是否正确展示；
- TTFT、实际模型、Route/Credential/Price Snapshot 和 Observation Incomplete 是否保持独立；
- 金额是否避免把 JavaScript `number` 当作权威计算结果。

### 真实入口与 Artifact

- 测试是否经过实际交付入口，而不是只挂载内部函数或测试专用装配；
- plain Node 编译产物、Vite Dist、Docker Compose、Migration 和静态资源路径是否按本次影响验证；
- 动态注册、构建配置、环境变量和 Loader 入口是否被消费者搜索覆盖；
- 开发模式成功是否被错误当成发布产物成功。

### 证据强度

- 每个行为变化是否至少有一个会为目标回归变红的测试；
- 断言是否验证 Mock Provider 实收、客户端字节、数据库 Request/Attempt、外部状态或清理结果，而不是相信系统自己的“成功”消息；
- Property、Protocol Fixture、Integration、Playwright 和 Artifact Smoke 是否与风险表面匹配；
- 测试是否只复述实现，或通过过宽 Mock、固定延时、文本子串和空 Snapshot 制造假通过；
- 是否存在负向控制，能证明 Guard 在错误输入或错误生命周期下确实失败；
- 覆盖率只用于发现缺口，不能替代场景正确性。

### 文档与可见文字

- 当前行为是否同步到唯一拥有文档，而不是复制第二份规范；
- Decision 是否只解释长期取舍，不覆盖源码和现行 Convention；
- 注释是否陈述代码无法表达的契约、所有权、竞态、安全或失败语义，而非叙述控制流；
- Prompt、诊断、错误消息和 UI 文案是否按行为变化审查并有相应 Snapshot、Component 或浏览器证据；
- 中文是否仍是当前事实来源，英文旧入口是否没有反向覆盖中文事实；
- 是否存在 PR、评审或设计会话视角残留。

## 报告 Finding

只报告可执行且有证据的问题。每项使用以下结构：

```text
[blocker | high | medium | suggestion] 简短标题
位置：最窄相关文件与行
缺陷：当前代码实际做了什么
影响：哪个合同、用户路径或不变量会被破坏
证据：调用链、反例、现有规则或可复现条件
建议修正：最小拥有面上的修复方向
```

规则：

- 阻断项和建议分开；
- 不把个人偏好或纯格式问题伪装成正确性缺陷；
- 已由绿色 Gate 完整强制且没有语义缺口的问题不重复报告；
- 无法证明的怀疑标为待验证，不用肯定语气；
- 跨切面问题使用 PR 级总结，局部缺陷定位到最窄 Diff；
- 审查结束列出确认的 Base/Head、实际读取范围、实际命令、未验证项和剩余风险。

本 Skill 的工作流参考 DeepSeek Harness `dsh-code-review`，已按本项目重写；许可见 [Third-Party Notices](../THIRD_PARTY_NOTICES.md)。
