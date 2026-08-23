---
status: active
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 文档地图

本仓库把源码与规范放在同一个事实系统中。模块化文档是维护源，单文件规范是自动生成投影；不要同时手工维护两份相同内容。

## 事实来源

| 内容 | 唯一事实来源 |
| --- | --- |
| 产品目标、范围和术语 | `docs/product/` |
| 当前代码结构和运行关系 | `docs/architecture/` + 当前源码 |
| Feature 用户语义 | `docs/features/` |
| 控制面 API | `createRoute` 生成的 `/admin/openapi.json` |
| 请求与响应 Schema | Zod Route Schema |
| 数据库结构 | Drizzle Schema + 已提交 SQL Migration |
| 前端 API 类型 | OpenAPI 自动生成的 `apps/web/src/api/schema.d.ts` |
| UI 页面、Token 和交互 | `docs/product/ux/` + 当前 Web 源码 |
| 协议兼容行为 | Data Plane 源码、协议 Fixture 和测试 |
| 依赖边界 | ESLint、`verify:boundaries` 和架构文档 |
| 长期决策与取舍 | `docs/decisions/` |
| 临时实施序列 | `docs/plans/` |
| 单文件规范 | `pnpm docs:bundle` 生成的 `.artifacts/spec/` |

Decision Note 解释为什么存在某个选择，但不覆盖当前源码和现行规范。历史规范不保存在活动文档树中，由 Git Tag 和 Release 负责追溯。

## 按任务阅读

| 任务 | 必读 |
| --- | --- |
| 理解项目目标 | `product/README.md`、`product/overview.md`、`product/scope-and-principles.md` |
| 修改产品概念或术语 | `product/product-definition.md`、`product/glossary.md`、相关 Feature |
| 修改系统边界 | `architecture/system-overview.md`、`architecture/repository-layout-and-dependency-boundaries.md` |
| 修改数据面协议 | `architecture/data-plane-protocol-proxy.md`、`conventions/data-plane-streaming.md` |
| 修改路由或回退 | `architecture/routing-engine.md`、相关 Decision Note |
| 修改 Provider/账号/凭据 | `features/connections-and-accounts.md`、`conventions/security-and-secrets.md` |
| 修改模型和 models.dev | `features/models-and-models-dev.md` |
| 修改客户端 Key | `features/clients-and-gateway-keys.md`、`conventions/security-and-secrets.md` |
| 修改 Request / Attempt | `features/requests-and-observability.md`、`architecture/domain-model.md` |
| 修改价格与成本 | `features/pricing-and-cost.md` |
| 新增控制面 API | `conventions/http-contracts-and-route-definition.md`、`conventions/control-plane-api.md` |
| 修改数据库 | `architecture/domain-model.md`、`conventions/database.md` |
| 修改前端 | `product/ux/README.md`、对应页面规范、`conventions/web-product-ux.md` |
| 修改中文文案或国际化 | `conventions/language-and-localization.md` |
| 修改 TypeScript 注释或抑制指令 | `conventions/typescript-comments.md`、`.agents/skills/typescript-comments/SKILL.md` |
| 创建或拆分 Commit | `conventions/git-commits.md`、`.agents/skills/git-commit/SKILL.md` |
| 修改版本或准备发布 | `conventions/versioning-and-release.md`、`.agents/skills/version-release/SKILL.md` |
| 修改测试或质量 Gate | `conventions/testing-and-acceptance.md`、`conventions/quality-gates-and-evidence.md`、`conventions/change-scope-and-evidence.md` |
| 修改运行时关系或生命周期 | `conventions/runtime-invariants.md`、`conventions/defensive-patterns.md` |
| 阶段收口或删除熵 | `conventions/simplification-and-entropy-control.md`、`.agents/skills/simplification-audit/SKILL.md` |
| 处理逃逸缺陷 | `postmortems/README.md`、`.agents/skills/postmortem/SKILL.md` |
| 修改 Agent 工作流 | `conventions/vibecoding-and-agent-governance.md`、`ai/`、`.agents/skills/` |
| 查看当前实现边界 | `architecture/current-implementation.md` |
| 查看后续顺序 | `roadmap/implementation-plan.md` |
| 首次启动仓库 | `checklists/repository-activation.md` |

## 阅读规则

1. 先从本页选择最小相关文档；
2. 再读目标目录最近的 `AGENTS.md`；
3. 用 `rg`、源码、测试、Migration、OpenAPI 和 package scripts 核对当前事实；
4. 不因文档看起来完整就推定功能已经实现；
5. 修改当前行为时同步对应文档，修改长期选择时同步 Decision Note；
6. 运行 `pnpm docs:check` 检查链接、引用、中文优先规则和规范投影。
