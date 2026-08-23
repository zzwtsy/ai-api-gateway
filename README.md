# AI API Gateway

> 中文优先、个人自托管、面向 AI Harness 的多厂商 API Gateway。

当前版本：`0.1.0-alpha.3`。项目仍处于架构验证和纵向切片阶段，尚未承诺稳定配置格式或向后兼容性。

## 项目定位

AI API Gateway 为 Codex、Claude Code、Pi 等 Harness 提供稳定入口，在**相同协议内**完成模型映射、多账号/API Key 调度、保守回退、请求诊断和成本分析。

项目坚持以下边界：

- 不在 OpenAI Chat Completions、OpenAI Responses、Anthropic Messages 之间做跨协议转换；
- 不根据视觉、音频或工具能力自动切换模型；
- 不隐藏上游不支持的字段，也不模拟 Provider 行为；
- 不把个人自托管产品演化成企业多租户平台；
- 不让观测、日志或统计阻塞流式响应主路径。

## 中文优先

中文是项目的默认沟通语言和现行文档事实来源：

- `README.md`、`docs/`、Issue、PR 说明和用户界面默认使用简体中文；
- 代码标识符、文件名、HTTP 字段、`operationId`、错误码和环境变量使用英文；
- 技术术语首次出现时优先使用“中文名称（English term）”；
- 英文内容是面向国际贡献者的辅助投影，不反向要求每次修改都维护一套完整双语文档；
- 前端默认语言为 `zh-CN`，但不得通过中文硬编码阻断未来国际化。

完整规则见 [语言与本地化约定](docs/conventions/language-and-localization.md)。英文简介见 [README.en.md](README.en.md)。

## 当前已经实现

仓库不是空模板，而是实际产品的早期主干。当前包含两条可执行的黄金路径（Golden Path）：

### 控制面黄金路径

```text
Connections createRoute
→ 类型化 Handler
→ Service / Repository
→ PostgreSQL
→ OpenAPI
→ 前端类型客户端
→ 连接页面
```

### 数据面黄金路径

```text
Gateway Client Key
→ 不可变 RoutingSnapshot
→ Undici 上游连接池
→ OpenAI Chat 原始 SSE 透传
→ 有界旁路观测
→ Request / Attempt 记录
→ 请求检查器
```

当前仍是 Bootstrap 实现的部分包括单个环境变量客户端密钥、单个上游凭据、静态路由快照、OpenAI Chat 单协议入口和部分内存适配器。准确边界见 [当前实现状态](docs/architecture/current-implementation.md)。

## 可执行防腐机制

仓库把 Agent 规则落实为可失败的工程合同：

```text
显式 change-scope
→ 风险与证据选择
→ 有依赖图的 Gate Runner
→ 模块运行时不变量
→ Keyless 真实组合 Snapshot
→ plain Node / 编译产物浏览器 / Docker Smoke
→ 逃逸缺陷 Postmortem
→ 阶段性简化审计
```

常用入口：

```bash
pnpm change-scope --base origin/main
pnpm evidence:select --base origin/main
pnpm hygiene
```

未知路径不会被默认视为安全，而会升级为完整检查。详细规则见 [变更范围与证据选择](docs/conventions/change-scope-and-evidence.md)、[运行时不变量](docs/conventions/runtime-invariants.md)和[简化与熵控制](docs/conventions/simplification-and-entropy-control.md)。

## 技术基线

```text
Node.js 24 LTS
TypeScript 6.0.3（全仓库唯一版本）
pnpm workspace

Hono + @hono/zod-openapi
Undici Pool
PostgreSQL + Drizzle
Better Auth
Pino

React + Vite
shadcn/ui 4.19.0 + Base UI 1.7.0 + Nova
Antfu ESLint Config 9.3.0
TanStack Router + Query
React Hook Form + Zod
openapi-typescript + openapi-fetch + openapi-react-query

Vitest + Testcontainers + Playwright
Docker Compose
```

明确禁止 TypeScript 7、`@typescript/native`、`@typescript/typescript6` 和工作区私有 TypeScript 声明。

前端基础组件由 shadcn 官方 Registry 契约拥有，项目只保留经过记录的产品语义增量。当前固定 `base-nova`、Base UI 和 Lucide；不得手工改回 Radix Primitive 或维护仿 shadcn 基础组件。详见 [官方工具链基线](docs/references/official-toolchain-baseline.md)。

## 仓库结构

```text
apps/
├── gateway/       数据面、控制面、数据库与进程生命周期
├── web/           React 桌面控制面
└── e2e/           Mock Provider 与浏览器端到端测试

docs/
├── product/       产品目标、范围、术语与 UX
├── architecture/  当前/目标架构、协议、路由与边界
├── conventions/   当前开发、API、测试、安全和语言约定
├── features/      各产品能力的现行设计
├── decisions/     长期决策、替代方案和后果
├── roadmap/       仍未完成的实施序列
└── references/    OpenAPI 轮廓、Schema、样例和外部来源

ai/                Agent 任务上下文与验证矩阵
.agents/skills/    可复用 AI 开发工作流
scripts/           生成、校验和质量门禁
fixtures/          协议与 Provider 回放样例
```

[文档地图](docs/README.md) 按任务给出最小阅读路径。不要默认把整个 `docs/` 塞入 Agent 上下文。

## 首次启动

源码归档不伪造无法验证的 `pnpm-lock.yaml`，也不会把 Bootstrap OpenAPI 类型冒充为正式生成物。首次克隆后执行：

```bash
corepack enable
pnpm install
pnpm api:generate

cp .env.example .env
pnpm db:start
pnpm db:migrate
pnpm dev
```

默认开发地址：

```text
Web 控制面： http://127.0.0.1:5173
Gateway：    http://127.0.0.1:3001
模拟上游：   http://127.0.0.1:4010
```

仅用于本地开发的假凭据：

```text
控制面令牌：     admin_dev_local
网关客户端密钥： gw_dev_local_key
```

生产启动会拒绝这些固定值。完整步骤见 [仓库激活清单](docs/checklists/repository-activation.md)。

## 常用命令

```bash
pnpm check:quick       # 快速静态、类型和单元证据
pnpm check:control     # 控制面 OpenAPI 与生成客户端
pnpm check:data        # 路由、凭据、传输和观测
pnpm check:protocol    # 原始协议与流式黄金路径
pnpm check:db          # PostgreSQL / Testcontainers
pnpm check:web         # 前端类型、测试与构建
pnpm check:e2e         # 完整浏览器旅程
pnpm check:artifact    # plain Node、编译产物浏览器与 Docker
pnpm check:docs        # 文档、Agent 资产和规范投影
pnpm hygiene           # Lint、Knip、重复代码、文档与边界
pnpm check:all         # 本地完整演练
```

单文件规范不手工维护，通过以下命令从模块化文档生成：

```bash
pnpm docs:bundle
```

输出位于 `.artifacts/spec/`，Git Tag 和 Commit 决定其版本事实。

## 不可破坏的工程不变量

- 数据面不得依赖控制面；
- 控制面与数据面使用不同 HTTP 契约；
- 未知 Provider 字段必须保留；
- Gateway Client Key 与 Provider Credential 必须分离；
- `Request` 与 `Attempt` 必须分开记录和统计；
- 上游 SSE 字节不得重新序列化；
- 禁止用 `Response.clone()`、`ReadableStream.tee()` 或 `streamSSE()` 构建长期旁路观测；
- 客户端取消必须传播到上游；
- 首个响应字节发出后不得切换 RouteTarget；
- 路由热路径只读取不可变快照，不逐请求查询配置表；
- 完整 Secret 不得进入日志、Fixture、Snapshot、OpenAPI Example 或默认导出；
- 模块导入不得启动 Server、Pool、Timer、Migration 或 Signal Handler。

修改仓库前先阅读 [AGENTS.md](AGENTS.md) 和最近的局部 `AGENTS.md`。

## 许可证

许可证尚未最终确定。公开发布前必须补充正式 `LICENSE` 和第三方许可证清单；在此之前不要把仓库内容视为已授权再分发。
