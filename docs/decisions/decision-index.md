---
document_id: AIGW-ADR-INDEX
status: normative
last_reviewed_at: 2026-08-24
language: zh-CN
---

# 设计决策记录（Decision Index）

长期决策的生命周期、模板和独立文件见 [`docs/decisions/`](README.md)。本文件是产品与工程决策索引；当前源码和现行规范仍是行为事实来源。

## ADR-001：不进行跨协议转换

**状态：Accepted**

Chat、Responses、Anthropic 只路由到相同协议 Endpoint。工具调用、Reasoning、流事件、缓存、错误和状态语义无法通过稳定映射完整保真。

## ADR-002：取消视觉路由和 Capability Adapter

**状态：Accepted**

图片、音频、工具等请求能力不参与自动路由，不调用第二个模型补充能力。保持请求单阶段、成本可解释和行为确定。

## ADR-003：Request 与 Attempt 分离

**状态：Accepted**

逻辑请求与真实上游调用分别持久化。最终成功可以包含失败 Attempt，成本为所有 Attempt 的合计。

## ADR-004：Gateway Client Key 与 Provider Credential 分离

**状态：Accepted**

客户端 Key 用于识别 Harness，只保存 HMAC/哈希；上游 Credential 运行时需要解密，使用加密密文。

## ADR-005：UpstreamEndpoint 是路由基础单位

**状态：Accepted**

同一 Provider 的不同协议、套餐、Base URL 和兼容性不同，不能以 Provider 上的一组 Boolean 替代 Endpoint。

## ADR-006：模型映射直接由 RouteRule 表达

**状态：Accepted for MVP**

MVP 不引入独立 ModelAlias 表。出现跨多个 Rule 的真实复用需求后再评估。

## ADR-007：models.dev 只用于预填

**状态：Accepted**

外部元数据不得覆盖本地手动值，也不作为可用性证明。

## ADR-008：流式响应进行字节透传

**状态：Accepted**

Observer 旁路解析，不重新生成 SSE。保留未知事件、顺序和厂商扩展。

## ADR-009：首字节后禁止回退

**状态：Accepted**

避免重复文本、重复 Tool Call 和不可恢复的流状态。

## ADR-010：MVP 使用 PostgreSQL + Drizzle

**状态：Accepted**

Request/Attempt、JSONB、聚合、迁移和日志量更适合 PostgreSQL。Drizzle 负责 Schema、Migration 和普通查询；复杂分析允许显式 SQL。

## ADR-011：单进程数据面与控制面

**状态：Accepted**

MVP 使用同一 Node.js 24 服务进程和独立模块边界，不引入 Redis/Queue。未来多实例需新 Decision Note。

## ADR-012：Gateway 自有错误按入口协议序列化

**状态：Accepted**

OpenAI/Codex 与 Anthropic 入口使用各自最小兼容错误 Envelope，并添加稳定 `x-gateway-error-code`。这不是跨协议转换。

## ADR-013：Desktop-first UI

**状态：Accepted**

最低完整承诺 1280px；1024px 保持核心任务可用；不实现手机完整控制面。

## ADR-014：高风险配置显式保存

**状态：Accepted**

Routing Rule、Credential、价格和日志策略不自动保存；UI 偏好可以自动保存。

## ADR-015：TypeScript 6 单版本

**状态：Accepted**

全仓库只安装一个 TypeScript 6.x 稳定补丁版本，不采用 TypeScript 7、Native Compiler 或双版本别名。

详细记录：[TypeScript 6 单版本](implemented/2026-08-22-typescript-6-single-version.md)。

## ADR-016：控制面与数据面使用不同 HTTP Route 合同

**状态：Accepted**

Control Plane 使用 `createRoute → typed handler → service → OpenAPI`；Data Plane 使用普通 Hono Route、最小字段提取和原始协议响应。

详细记录：[控制面与数据面 Route 边界](implemented/2026-08-22-control-data-plane-route-boundary.md)。

## ADR-017：Application Composition 显式注册

**状态：Accepted**

Feature Router 在稳定文件中显式挂载；不使用自动文件扫描。`createApplication()` 不启动 Server、DB、Pool、Timer 或 Signal。

## ADR-018：模块化单体优先，不建立通用插件运行时

**状态：Accepted**

MVP 使用显式 Composition Root、静态 Registry 和小型 Interface，不复制 Everything-is-a-plugin 架构。

详细记录：[模块化单体优先](implemented/2026-08-22-modular-monolith-before-plugins.md)。

## ADR-019：有界 Observer Tap

**状态：Accepted**

主流受客户端背压控制；旁路观测使用有界队列，满载时标记不完整。禁止 `Response.clone()`、`ReadableStream.tee()` 和 SSE 重序列化。

详细记录：[有界、非阻塞流式观测](implemented/2026-08-22-bounded-observer.md)。

## ADR-020：以可执行证据约束 Vibecoding

**状态：Accepted**

使用文档路由、局部 AGENTS、机器依赖边界、Decision Note、Keyless Snapshot、生成物新鲜度、Source/Artifact 双路径和变更证据矩阵。

详细记录：[可执行证据驱动的 Vibecoding](implemented/2026-08-22-evidence-driven-vibecoding.md)。

## ADR-021：先固化规范，再生成薄项目模板

**状态：Superseded**

该阶段性决定完成了工程 Spine 与两条黄金路径验证。规范和模板已由 ADR-023 合并为同一仓库与统一版本线。

历史记录：[规范先行、薄模板随后](superseded/2026-08-22-spec-first-template-second.md)。

## ADR-022：控制面 OpenAPI 是前后端合同

**状态：Accepted**

`createRoute` 是控制面 API Source of Truth；静态导出、Contract Test、前端 OpenAPI 类型生成和 Freshness Diff 进入 CI。数据面 OpenAPI 仅作为宽松说明，不拥有完整 Provider DTO。

## ADR-023：规范与实现合并为单一仓库

**状态：Accepted**

源码、模块化规范、Decision Note、Agent 资产和测试在同一个 Git Commit 中演进。完整规范、工程规范、前端规范、OpenAPI 和发布产物从同一版本生成，不再维护独立规范/模板版本。

详细记录：[单一仓库与生成投影](implemented/2026-08-22-unified-repository-and-generated-projections.md)。

## ADR-024：项目中文优先而非中文限定

**状态：Accepted**

中文是默认文档、界面和协作语言；代码标识符、API 字段、Error Code、环境变量和生态技术边界保持英文。英文文档是辅助入口，不强制全量双语配对。

详细记录：[中文优先项目](implemented/2026-08-22-chinese-first-project.md)。

## ADR-025：使用可执行防腐闭环约束 Agent 变更

**状态：Accepted**

以显式 Change Scope、证据选择、Gate DAG、运行时不变量、Keyless 真实组合 Snapshot、Artifact Lane、Postmortem 永久 Guard 和阶段性简化审计控制提交熵。未知路径保守升级为完整检查。

详细记录：[仓库可执行防腐闭环](implemented/2026-08-22-repository-anti-corruption-loop.md)。

## ADR-026：Web 使用文件路由与 OpenAPI TypeScript Query 链路

**状态：Accepted**

TanStack Router 使用文件路由与生成 Route Tree；`components/ui` 固定为 shadcn Registry-owned；控制面请求采用 `openapi-typescript → openapi-fetch → openapi-react-query → TanStack Query`，避免手写 API Wrapper 与双重服务端状态缓存。

详细记录：[Web 文件路由与 OpenAPI Client](implemented/2026-08-23-web-file-routing-and-openapi-client.md)。

## ADR-027：shadcn Registry 保持官方源码

**状态：Accepted**

`components/ui` 不接受手工 Patch 或 Formatter 改写；产品差异进入语义 Token、`components/product` 或布局组合。Web 采用 `base-nova + Blue + Inter`，App Shell 组合官方 `inset + icon` Sidebar。

详细记录：[shadcn Registry 保持官方源码](implemented/2026-08-23-upstream-exact-shadcn-registry.md)。

## ADR-028：Agent Skill 中英文均可并优先英文

**状态：Accepted**

Skill 指令可使用中文或英文，新写内容优先英文；文档、AGENTS、协作输出和 Web UI 继续默认中文。

详细记录：[Agent Skill 中英文均可并优先英文](implemented/2026-08-23-english-preferred-agent-skills.md)。

## ADR-029：同步应用版本并从已验证 Commit 发布

**状态：Accepted**

根 `package.json` 是唯一项目版本所有者；版本 Setter 定点同步全部投影，发布只从已进入 `main` 且相同 SHA 主 CI 全绿的 Release Commit 手动触发。镜像成功后创建 Annotated Tag 与 GitHub Release。

详细记录：[同步应用版本并从已验证 Commit 发布](implemented/2026-08-23-synchronized-version-and-verifiable-release.md)。

## ADR-030：仓库脚本使用 Node.js 原生 TypeScript

**状态：Accepted**

项目拥有的根配置与仓库脚本统一使用 TypeScript 6，由 Node.js 24 原生 type stripping 直接执行，并通过 `scripts/tsconfig.json` 独立严格检查；不引入第二个 TypeScript 运行器或脚本预编译目录。

详细记录：[仓库脚本使用 Node.js 原生 TypeScript](implemented/2026-08-23-native-typescript-repository-scripts.md)。

## ADR-031：Provider Secret 与 Gateway Client Key 使用不同的耐久存储

**状态：Accepted**

Provider Secret 使用可轮换 Keyring 的 AES-256-GCM，并以 Credential ID 作为 AAD；Gateway Client Key 使用 256-bit CSPRNG 和带 Pepper 的 HMAC-SHA-256，只保存 Prefix 与 Last4。完整 Gateway Key 只在 `no-store` 创建或轮换响应出现一次。

详细记录：[Provider Secret Keyring 与 Gateway Client Key 持久化](implemented/2026-08-24-durable-secret-and-gateway-key-storage.md)。

## Decision 模板

新决策使用 [`docs/decisions/_template.md`](_template.md)，并放入 `proposed/`、`implemented/`、`rejected/` 或 `superseded/`。ADR 编号保留为索引，不要求每个独立文件继续使用数字编号。
