---
status: active
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 语言与本地化约定

## 项目定位

AI API Gateway 是**中文优先**项目，不是中文限定项目。中文是默认产品语言、维护语言和现行文档事实来源；国际生态接口保持英文稳定标识。

## 内容语言

| 内容 | 默认语言 |
| --- | --- |
| `README.md`、`docs/`、AGENTS、Skill | 简体中文 |
| Web 用户界面 | 简体中文（`zh-CN`） |
| Issue、PR 描述、评审意见 | 简体中文；英文同样接受 |
| 代码标识符、文件名、包名 | 英文 |
| HTTP 字段、OpenAPI `operationId` | 英文 |
| Error Code、日志字段、环境变量 | 英文 |
| 提交类型和 Scope | 英文 Conventional Commit 前缀 |
| 提交摘要 | 中文优先，可以英文 |

## 术语规则

- 面向用户先写中文，例如“连接”“路由”“客户端”“请求”；
- 对精确工程实体首次写“逻辑请求（Request）”“上游尝试（Attempt）”“路由快照（Routing Snapshot）”；
- 同一页面后续不反复中英并列；
- Provider、Endpoint、Token、API、SSE、TTFT 等已普遍使用的术语可以保留英文；
- 不把代码中的英文枚举值直接显示给用户，应映射为中文标签；
- Error Code 保持英文，用户可见 `message` 使用中文。

## 文档策略

- 中文模块化文档是事实来源；
- `README.en.md` 只提供国际贡献者入口，不要求完整镜像所有文档；
- 不建立每份内部文档的中英文强制配对 Gate；
- 英文翻译落后时必须明确其辅助性质，不得让英文旧文档反向覆盖中文当前事实；
- 单文件中文规范由 `pnpm docs:bundle` 生成；未来英文规范应从相同结构投影，而不是复制后独立维护。

## 前端国际化边界

当前只有一个实际语言，因此暂不引入完整 i18n 框架。新增第二语言前必须：

1. 新增 Decision Note；
2. 把用户可见字符串收敛到类型安全消息目录；
3. 定义 Locale 选择、持久化和回退策略；
4. 验证日期、数字、金额、时区和复数；
5. 保持 `zh-CN` 为默认值；
6. 不把 Error Code、模型 ID、Provider ID 和 Request ID 翻译。

在第二语言出现前，仍应使用 `lang="zh-CN"`、`Intl` 和语义化中文，不编写假装可扩展但无人维护的空翻译层。
