---
name: simplification-audit
description: 在阶段收口、发布前、出现重复状态/抽象，或新增 Package、Registry、State Machine、公开配置和基础设施前使用；基于真实消费者、生命周期所有权和净删除面审计代码熵。
---

# 简化审计

简化的目标是减少项目拥有的实现、测试、文档、兼容和运行时状态面，不是把相同复杂度搬进新 Wrapper。优先提出少量证据充分的候选；`knip`、`jscpd`、模块图和行数只用于发现，不是删除结论。

## 事实来源

- [简化与熵控制](../../../docs/conventions/simplification-and-entropy-control.md)
- [防御性工程模式](../../../docs/conventions/defensive-patterns.md)
- [Decision Notes](../../../docs/decisions/README.md)
- [质量门禁与验证证据](../../../docs/conventions/quality-gates-and-evidence.md)
- 受影响模块最近的 `AGENTS.md`、源码、测试、Decision 和 Postmortem

## 强候选

- 公开方法、事件、配置项、类型、Registry Hook 或 Durable Field 没有生产消费者；
- 只有测试或文档引用，且行为不是兼容承诺或负向保证；
- 两个缓存、事件、数据库字段或内存对象镜像同一权威事实；
- 单一调用方的 Package/Repository/Port 没有独立发布、替换或隔离价值；
- Feature 提前实现没有当前产品所有者的通用性；
- Invariant、Rollback、Fixture 或 Expected Output 只保护已经删除的 API；
- 手写 Parser、Retry、Glob、Diff 或基础设施可被健康依赖或 Node 24 内置完整覆盖，并能净删除实现与专用测试；
- 维护源与生成物同时手工维护；
- 多个 Promise、Sentinel、Boolean 和 Disposer 表达同一个 Liveness 或 Settlement 事实。

“看起来复杂”、一次 `knip` 输出或几行重复代码不是强证据。

## 必须保留或谨慎处理

- 真实生产入口、动态注册、配置加载、构建产物或 Mock Provider 消费；
- 现行 Decision 保护的协议、Secret、兼容和负向保证；
- 数据库、Wire、导出、Fixture 或历史快照兼容义务；
- Client Abort、首字节边界、Rollback、Observer 隔离和 Shutdown 到静止所需的独立所有者；
- 只在 plain Node、Vite Dist、Docker、Migration 或浏览器入口暴露的 Glue；
- 同协议透明代理无法由 Provider SDK 等抽象提供同等保证的部分。

## 证明消费者

对每个候选同时搜索：

- 精确 Symbol、方法调用、Config Key、Error Code、Event Name、Wire String 和环境变量；
- `src` 中的生产消费者；
- 测试、文档、Snapshot 和 Fixture 消费者；
- Composition Root、Route 注册、动态 Loader、构建配置、脚本和 Docker 入口；
- 数据库 Migration、历史格式和导出兼容路径。

分类为：

```text
production
non-production
build-or-dynamic
compatibility
no-consumer
```

读调用点后再分类。不要把测试是唯一消费者自动等同于可以删除；测试可能钉住重要的负向保证。

## 异步所有权图

复杂生命周期必须画出或列出：

```text
operation
├── owner
├── publication point
├── cancellation source
├── settlement point
├── disposer
└── quiescence evidence
```

把每个 Sentinel、Readiness Promise、AbortController、状态位、终态标记和 Cleanup 注册映射到一个独立关系。多个机制镜像同一完成事实时，优先合并为一个 Controller 或事务。

不能仅为了减少字段合并以下正交关系：

- 同步发布与失败回滚；
- Callback 异常隔离；
- 首个终态仲裁；
- Worker/Process/Socket 所有权；
- Abort 发出与资源真正静止；
- Provider Outcome、Termination、Retry、Fallback、Observation 和最终 Request Outcome。

## 依赖替换

新增依赖可以是简化，但必须列出：

1. 上游库或 Node 内置完整覆盖的实际表面；
2. 未覆盖、仍需项目拥有的残余语义；
3. 对协议透明性、Streaming、Secret、Abort 和发布入口的影响；
4. 维护活跃度、采用度、传递依赖、License 和供应链风险；
5. 净删除面：删除的实现、专用测试、文档与兼容分支，减去新增 Glue、适配测试和运维成本。

只增加一个 Wrapper、却保留原来的 Parser/State Machine 和专用测试，不是简化。

## Decision 取代关系

新增或修改 Decision 前搜索相同机制、被否决替代方案和旧文件名：

- `implemented` 仍约束当前工程时保留；
- 新决策完全取代旧决策时，把旧文件移动到 `superseded/`，在旧 Note 中链接新拥有者；
- 仍有独立兼容义务、耐久格式、当前行为或拒绝理由时属于部分取代，保持交叉链接；
- 不能悄悄把旧 Decision 改写成相反结论；
- 当前 Convention、源码和测试拥有现实，Decision 拥有长期理由。

不要把每次局部清理扩张成全仓库 Decision 归档。只有行为边界或长期理由发生变化时处理。

## 工作流

1. 运行 `pnpm change-scope --base <confirmed-base>`，确认当前 Diff 和风险表面；
2. 读取拥有规则、现行 Decision、最近测试和真实入口；
3. 广泛搜索候选，先调查最大生产代码和状态机，不停在第一个 Dead Symbol；
4. 分类生产、非生产、动态/构建、兼容和无消费者；
5. 对生命周期候选建立所有权图；对依赖候选建立残余语义和净删除表；
6. 拒绝证据不足、只转移复杂度或会破坏负向保证的候选；
7. 小型局部清理直接实现；改变长期边界、公开行为或基础设施时先写 proposed Decision Note；
8. 同时删除过期实现、专用测试、文档、生成物、配置和旧引用；
9. 搜索被删 Symbol、Wire String、Config Key 和文件名，确认没有动态残留；
10. 运行 Hygiene、受影响行为 Gate 和必要 Artifact Smoke。

## 候选记录

每个非平凡候选至少记录：

```markdown
## <动作型标题>

- 当前拥有者：
- 当前行为与合同：
- 生产消费者：
- 非生产消费者：
- 动态/构建/兼容入口：
- 删除或合并内容：
- 仍需保留的残余语义：
- 净删除面：
- 放弃能力与风险：
- 是否需要 Decision：
- 验证：
```

没有明确生产调用点和兼容搜索结果时，不把候选标为已证明。

## 验证

```bash
pnpm knip
pnpm duplication
pnpm docs:module-graph:check
pnpm hygiene
```

再运行 `evidence:select` 指定的行为 Gate。涉及构建、动态入口或依赖替换时增加 `pnpm check:artifact`；涉及长期文档和 Decision 时增加 `pnpm check:docs`。发布前运行 `pnpm check:all`。

禁止通过全局 Ignore、永久 Allowlist、提高阈值、删除负向测试或弱化不变量制造“简化成功”。

本 Skill 吸收 DeepSeek Harness `dsh-find-simplifications` 的消费者证明、生命周期所有权、依赖替换和决策取代审计，并按本项目重写；许可见 [Third-Party Notices](../THIRD_PARTY_NOTICES.md)。
