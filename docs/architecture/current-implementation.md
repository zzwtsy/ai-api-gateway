---
status: active
last_reviewed_at: 2026-08-24
language: zh-CN
project_version: 0.1.0-alpha.3
---

# 当前实现状态

![当前容器与运行时架构](../diagrams/current-container-architecture.png)

本文件只描述当前源码已经提供的能力，不把目标设计冒充为已实现产品。

## 已稳定的工程接缝

以下模式可以被后续 Feature 复制：

- 无 Import 副作用的显式 Application Composition；
- 控制面与数据面使用不同 HTTP 契约；
- 控制面采用 `routes.ts → handlers.ts → service.ts → index.ts`；
- 数据面完整 Provider Body 使用宽松 JSON，未知字段不被不完整 DTO 过滤；
- 热路径从不可变 `RoutingSnapshot` 读取路由决定；
- Gateway Client Key 与 Provider Credential 使用不同类型和所有者；
- 主流旁边使用有界、非阻塞观测；
- `Request` 与 `Attempt` 分开持久化；
- 单元、协议、PostgreSQL、浏览器和编译产物是不同证据层；
- TypeScript 6.0.3 由根 Workspace 单独拥有；
- Web 基础组件采用 shadcn `base-nova` 与 Base UI，配置、依赖和 Primitive 由工具链门禁固定；
- 通用 Lint 基线采用 `@antfu/eslint-config`，项目只叠加架构边界与质量棘轮；
- Web TypeScript 拆分 Browser App 与 Node Tooling 两个 Project Reference；
- Change Scope、证据选择和 Gate DAG 是统一质量入口；
- Routing、Transport、Recording、Observation、Probe Resource Shutdown 和进程 Shutdown 拥有运行时不变量；
- Keyless Snapshot 同时固定 Provider 实收、Client 实收和 Request/Attempt；
- CI 分为 Static、Core、Protocol 和 Artifact 四个证明面；
- Postmortem 与简化审计分别负责把逃逸缺陷变成永久 Guard、删除无主代码。

## 已实现的控制面

- 健康检查；
- Connection 聚合列表、详情、创建、受控删除、额外协议 Endpoint 创建、Credential 轮换、禁用和显式最小 Probe；删除会清理配置级数据但保留 Request/Attempt 历史，并阻止删除进行中的 Compatibility Probe；
- Endpoint 完整兼容性 Probe 的异步 Run、进度查询，以及按 Endpoint、Harness Profile 和模型保存的兼容性事实；
- Harness Profile 与 Gateway Client 列表、创建、Key 轮换和撤销；
- Endpoint 级最小 Provider Model Binding 列表、创建和显式 OpenAI-compatible 上游模型发现；
- Request 列表和 Request/Attempt 详情；
- Better Auth 接口和仅开发环境可用的控制面令牌；
- OpenAPI 静态导出与 Scalar Reference；
- 前端 OpenAPI 类型生成及新鲜度检查；
- Memory 与 PostgreSQL Repository Adapter。

完整兼容性 Probe 由 Application-owned Runner 顺序执行。PostgreSQL 使用活跃目标唯一索引合并重复任务，并以原子状态 Claim 确认唯一执行者；进程关闭时先中止并等待 Probe，再关闭 Undici 与 PostgreSQL。Probe 原始 Body、Header 和完整 Credential 不进入持久化结果。

## 已实现的数据面

- `POST /openai/v1/chat/completions`；
- Gateway Client Key 验证；
- PostgreSQL 模式从耐久哈希验证 Gateway Client Key，并按需解密 Provider Credential；
- 单个 Bootstrap `RoutingSnapshot`；
- Undici 按 Origin 管理连接池；
- 原始请求正文转发；
- 上游 SSE Chunk 按顺序透传；
- 客户端取消传播；
- 有界字节 Observer；
- Request/Attempt 开始与完成记录；
- Keyless Mock Provider 协议黄金路径。

## 当前 Bootstrap 实现

以下实现只是验证架构，不应被扩展成通用框架：

- 一个由环境变量中的耐久记录 ID 绑定的静态路由；
- Memory 模式直接使用环境变量 Gateway Client Key 与 Provider Credential；
- PostgreSQL 启动时只为缺失 ID 原子创建 Bootstrap Client/HMAC Key 和加密 Credential，已有记录、撤销与轮换状态不会被环境变量覆盖；
- Bootstrap Provider 只承载静态路由所需的 Account/Credential 父关系；Endpoint 与动态 Snapshot 仍属于下一条纵向切片；
- 仅 OpenAI Chat Completions 一个数据面协议；
- 单元和浏览器测试使用的 Memory Adapter。

后续应在现有接口后替换这些实现，而不是建立第二套并行结构。

## 下一条纵向切片

```text
RouteRule 编辑器
→ Snapshot Compiler
→ 原子发布
→ Data Plane 消费发布版本
→ Request 详情解释规则、目标和凭据
```

应先完成这条链路，再扩展广泛分析功能或第三种协议。
