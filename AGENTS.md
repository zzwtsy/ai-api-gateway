# Agent 工作指南

## 项目使命

构建中文优先、单用户、自托管、桌面优先、Harness-aware 的多厂商 AI API Gateway。系统保持 OpenAI Chat Completions、OpenAI Responses、Anthropic Messages 的协议边界，在相同协议内执行模型映射、多账号/API Key 调度、保守回退、请求诊断和成本分析。

## 不可破坏的产品语义

1. 保持入口协议，不做跨协议转换。
2. `Request` 与 `Attempt` 分离。
3. Gateway Client Key 与 Provider Credential 分离。
4. 除非存在明确、已记录的 Gateway Patch，否则保留未知 Provider 字段。
5. 观测工作不得阻塞响应主流。
6. 完整 Secret 不得出现在日志、API 响应、Fixture、Snapshot、截图或默认导出中。
7. 下游收到首个上游字节后，不得切换 RouteTarget。
8. `unknown`、无数据和 `0` 是不同状态。
9. 中文是项目默认文档、界面和协作语言；代码与协议标识符保持英文。
10. 全仓库只使用 TypeScript 6.0.3，一个版本、一个所有者。

改变以上语义必须新增 Decision Note，并获得用户明确接受。

## 按任务阅读

| 任务 | 先读 |
| --- | --- |
| 产品范围或术语 | `docs/product/README.md`、相关 Feature 文档 |
| 控制面 API | `apps/gateway/src/control-plane/AGENTS.md`、`docs/conventions/http-contracts-and-route-definition.md` |
| 数据面代理或 Streaming | `apps/gateway/src/data-plane/AGENTS.md`、`docs/architecture/data-plane-protocol-proxy.md`、`docs/conventions/data-plane-streaming.md` |
| Routing / Credential | `docs/architecture/routing-engine.md`、相关 Feature 和 Decision Note |
| 数据库 / Migration | `docs/architecture/domain-model.md`、`docs/conventions/database.md` |
| 前端 / UX | `apps/web/AGENTS.md`、`docs/product/ux/README.md`、`docs/conventions/web-product-ux.md`、`docs/references/official-toolchain-baseline.md` |
| 中文文案或国际化 | `docs/conventions/language-and-localization.md` |
| TypeScript 注释或抑制指令 | `docs/conventions/typescript-comments.md`、`.agents/skills/typescript-comments/SKILL.md` |
| 创建或拆分 Commit | `docs/conventions/git-commits.md`、`.agents/skills/git-commit/SKILL.md` |
| 版本准备或远端发布 | `docs/conventions/versioning-and-release.md`、`.agents/skills/version-release/SKILL.md` |
| 架构边界 | `docs/architecture/repository-layout-and-dependency-boundaries.md` |
| 工具初始化或升级 | `docs/references/official-toolchain-baseline.md`、`.agents/skills/update-shadcn/SKILL.md` |
| CI、构建或 Agent 资产 | `docs/conventions/vibecoding-and-agent-governance.md`、`docs/conventions/quality-gates-and-evidence.md`、`docs/conventions/change-scope-and-evidence.md` |
| 生命周期、并发或运行时关系 | `docs/conventions/runtime-invariants.md`、`docs/conventions/defensive-patterns.md` |
| 阶段收口或删熵 | `docs/conventions/simplification-and-entropy-control.md`、`.agents/skills/simplification-audit/SKILL.md` |
| 真实入口缺陷复盘 | `docs/postmortems/README.md`、`.agents/skills/postmortem/SKILL.md` |
| 非平凡工作 | `.agents/skills/execution-plan/SKILL.md`、`ai/change-evidence-matrix.md` |
| 完成或推送前 | `.agents/skills/pre-push-checks/SKILL.md` |

不要无差别读取整个 `docs/`。按任务路由读取，然后用当前源码、测试、Migration、OpenAPI 和 package scripts 核对事实。

## 工作循环

1. 用已确认 Base 生成 `change-scope`，确认任务、所有者和受影响不变量；
2. 读取最小相关文档和最近的测试；
3. 跨模块、协议、Schema、安全或生命周期修改先维护执行计划；
4. 修改最小拥有面，不建立平行架构；
5. 增加能够真正捕获回归的最窄证据；
6. 运行 `evidence:select` 和 `ai/change-evidence-matrix.md` 对应 Gate；
7. 同步 OpenAPI、生成客户端、Migration、当前文档和 Decision Note；
8. 检查 Diff、Secret、生成物和用户可见中文；
9. 报告实际命令、结果、未验证项和剩余风险。

## 禁止捷径

- 不手写官方工具已经能够生成的平行脚手架；shadcn、Antfu ESLint、OpenAPI Client 和 Migration 必须保留明确生成链；
- 不增加文件系统 Route 扫描；
- 不为单一消费者预建 Workspace Package 或通用 Repository 抽象；
- 不在透明代理路径使用 Provider SDK；
- 不把服务端状态复制到第二个全局前端 Store；
- 不在没有新 Decision Note 的情况下引入 Redis、ClickHouse、Kafka、Kubernetes 或插件运行时；
- 不安装 TypeScript 7、`@typescript/native`、`@typescript/typescript6`，也不允许 Workspace 自己声明 TypeScript；
- 不通过降低阈值、全局禁用规则或 `passWithNoTests` 绕过失败 Gate；
- 不维护两套互相独立的规范与源码版本；单文件规范必须由 `pnpm docs:bundle` 生成；
- 不添加没有生产 Consumer、负向测试和所有权清单的装饰性 Runtime Invariant；
- 不把逃逸缺陷只修成局部条件分支；必须分析原有证据为什么漏掉，并建立永久 Guard；
- 不让代码只增不减；每个 Phase 收口和发布前执行简化审计。
