---
document_id: AIGW-VIBE-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Vibecoding 与 Agent 工程治理

## 1. 目标

Vibecoding 在本项目中的定义不是“尽量让 AI 多写代码”，而是：

> 让 AI 在有限上下文中能够找到当前事实、沿着稳定模式修改代码、自动获得类型反馈，并用最小充分证据证明没有破坏协议、安全和运行时不变量。

工程治理必须同时优化：

- 可发现性；
- 局部上下文；
- 显式边界；
- 快速反馈；
- 机器可验证性；
- 决策可追溯；
- 生成物不漂移。

## 2. 事实来源分工

| 信息类型 | Source of Truth |
| --- | --- |
| 产品不可破坏语义 | `ai/coding-invariants.md`、范围文档 |
| 当前架构和目录 | `docs/architecture/` 与实际源码 |
| 控制面 HTTP 契约 | `createRoute` + OpenAPI |
| 数据库结构 | Drizzle Schema + 已提交 Migration |
| 当前 Feature 行为 | Feature Source、Test、Feature Doc |
| 长期决策与取舍 | `docs/decisions/implemented/` |
| 临时实施步骤 | 未提交或短生命周期 Execution Plan |
| Agent 工作规则 | 根与局部 `AGENTS.md` |
| UI 视觉事实 | `docs/product/ux/` + Token + Screenshot |
| 生成客户端 | OpenAPI 生成器输出 + Freshness Gate |

禁止把历史 Decision Note、旧计划或截图数据当成当前实现事实。

## 3. 文档路由，而不是全量读取

根 `AGENTS.md` 和 `docs/README.md` 必须提供“按任务阅读”表。

示例：

| 任务 | 必读 |
| --- | --- |
| 新增控制面 Feature | Route 规范、目录边界、错误契约、对应 Feature Doc |
| 修改数据面 Streaming | Data Plane `AGENTS.md`、协议代理、Testing、Defensive Patterns |
| 修改 Routing | Routing Engine、Snapshot Decision、Property Test Matrix |
| 修改 Secret | Security、Secret Invariants、Export/Logging Tests |
| 修改 Web 页面 | `docs/product/ux/README.md`、页面合同、Frontend AGENTS |
| 修改 Migration | Database Convention、Migration Runbook、Integration Tests |
| 修改构建/CI | Engineering Foundation、Quality Gates、对应 Decision Note |

Agent 不应在开始小任务前无差别读取整个 `docs/`。

## 4. AGENTS 层级

### 4.1 根 `AGENTS.md`

保持简洁，只包含：

1. 项目使命；
2. 不可破坏语义；
3. 仓库地图；
4. 按任务阅读路由；
5. 常用检查命令；
6. 完成报告格式；
7. 禁止行为。

### 4.2 局部 `AGENTS.md`

建议位置：

```text
apps/gateway/AGENTS.md
apps/gateway/src/data-plane/AGENTS.md
apps/gateway/src/control-plane/AGENTS.md
apps/web/AGENTS.md
apps/e2e/AGENTS.md
```

局部规则只约束该目录。例如 Data Plane 必须明确：

- 不进行跨协议转换；
- 不用不完整 DTO 重建请求；
- 不使用 `streamSSE()` 重建上游事件；
- 不使用 `Response.clone()` / `ReadableStream.tee()` 做长期 Observer；
- 首字节后禁止切换上游；
- Observer 不能阻塞主流；
- 客户端断开必须传播 Abort；
- Secret 不进入日志、Snapshot 或 Fixture；
- 热路径不查询控制面配置表。

## 5. Decision Note

非平凡变更必须新增或更新 Decision Note。路径：

```text
docs/decisions/
├── proposed/
├── implemented/
├── rejected/
└── superseded/
```

需要 Note 的变化：

- 协议语义；
- Routing/Fallback 语义；
- Request/Attempt 数据模型；
- Secret 生命周期；
- 持久化或 Wire Format；
- 数据库 Schema 所有权；
- 模块/Workspace 边界；
- 公开控制面 API 约束；
- 测试、发布或依赖政策；
- 引入新的运行时基础设施。

不需要 Note：

- 文案修正；
- 无行为变化的小型重构；
- 单文件明显 Bug；
- 生成物更新；
- 格式化。

模板：

```md
# Decision: <标题>

Status: proposed | implemented | rejected

## Problem
## Decision / Proposal
## Alternatives considered
## Consequences / Acceptance criteria
## Verification
```

必须记录真实考虑过的替代方案，不为填模板编造选择。

## 6. Execution Plan 与 Decision 分离

```text
Execution Plan
  临时、面向下一步、可随实施重写或删除

Decision Note
  长期、面向未来维护者、记录为什么和放弃了什么
```

跨阶段、跨 Feature、Schema 迁移或高风险数据面修改先写 Plan。Plan 至少包括：

- 目标；
- 非目标；
- 受影响不变量；
- 文件变更；
- 分阶段步骤；
- 最小验证闭环；
- 风险与回滚。

小改动直接实现，禁止为每次修改制造计划噪声。

## 7. 把规则变成机器门禁

文档中的重要规则必须映射到至少一种可执行证据：

| 规则 | 机器执行方式 |
| --- | --- |
| data-plane 不依赖 control-plane | ESLint Boundary |
| TypeScript 只使用 6.x 单版本 | Workspace 验证脚本 |
| operationId 唯一 | OpenAPI Contract Test |
| 生成客户端同步 | Freshness Diff |
| Route 协议一致 | Compiler + Property Test |
| 首字节后不回退 | Protocol Integration Test |
| Secret 不泄露 | Redaction/Fixture/Log Scan |
| Request 1:N Attempt | DB Constraint + Integration Test |
| unknown 不等于 0 | Domain Unit + API/UI Test |
| Agent 文档引用命令存在 | Agent Asset Check |
| 真实发布路径可运行 | Built Artifact / Docker Smoke |

“写在 AGENTS 里”不等于已经执行。

## 8. Agent Asset Freshness

必须有 `verify:agent-assets` 检查：

- Markdown 和 Skill 引用路径存在；
- 文档引用的 `package.json` script 存在；
- 不存在 TypeScript 7 或双版本安装说明；
- 不存在已删除目录的旧命令；
- 当前 `AGENTS.md` 与局部规则没有直接冲突；
- 规范中列出的 Quality Gate 能被根脚本解析。

AI 指令本身也是代码库资产，必须进入 CI。

## 9. Golden Path 优先

AI 新增功能前先搜索：

- 控制面 Golden Path；
- 数据面 Golden Path；
- 相同错误类型；
- 相同测试层级；
- 现有 Decision Note；
- 已有 Agent Workflow。

优先复制成熟模式，再根据差异做最小修改。禁止仅根据通用训练知识生成另一套架构。

## 10. 变更循环

```text
1. 从 PR/分支关系确认 Base
2. 运行 change-scope，读任务路由
3. 查当前源码/测试/配置
4. 列受影响不变量和风险信号
5. 运行 evidence:select，补充动态入口证据
6. 先补能让回归变红的测试或 Fixture
7. 实现最小改动
8. 更新 OpenAPI/Schema/Docs/Decision
9. 运行所选 Gate，检查 Diff 和生成物
10. 报告准确命令、结果和未验证项
```

完成报告必须列实际运行命令，不能只写“测试通过”。

## 11. 提交与 PR

推荐：

- 一个 PR 只处理一个可解释的 Scope；
- 代码、生成物和相关文档在同一 PR；
- 使用显式路径暂存，避免把无关 Agent 产物一起提交；
- PR 描述包括背景、变更、验证和剩余风险；
- CI 未通过时不声明完成；
- 不为迎合 Agent 自动修复而降低门禁。

## 12. 依赖政策

不采用“零新依赖”或“看到库就加”的极端。新增依赖必须回答：

- 是否净删除自有实现、专用测试和维护面；
- 是否活跃维护；
- 语义是否覆盖实际合同；
- 关键数据面是否被不可控抽象接管；
- 供应链与 License 是否可接受。

数据面协议透明性优先于代码行数减少。


## 13. 逃逸缺陷与永久 Guard

缺陷逃逸到真实入口、发布产物或用户环境后，不能只增加局部条件分支。使用 `docs/postmortems/_template.md` 分析：被破坏的运行时关系、原有证据为什么漏掉、哪个真实入口场景现在会失败，以及新 Guard 的负向证明。复盘完成后应更新局部 AGENTS、Convention、Decision 或 Runtime Invariant。

## 14. 主动删熵

每个 Phase 收口和发布前运行简化审计。先证明生产消费者和兼容义务，再删除无主公开 API、重复状态、推测性配置、过度拆包和已被成熟依赖完整覆盖的手写基础设施。`knip`、`jscpd` 和生成模块图只发现候选，最终判断遵循 `docs/conventions/simplification-and-entropy-control.md`。
