---
status: active
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Decision: 项目采用中文优先而非中文限定

Status: implemented

本记录中 Skill 默认中文的部分已由 [Agent Skill 中英文均可并优先英文](2026-08-23-english-preferred-agent-skills.md) 部分取代；其他中文优先边界继续有效。

## Problem

维护者以中文工作，若强制所有内部文档、Issue 和设计过程先写英文，会显著增加表达成本并降低规范准确性；但代码、API 和开源生态需要稳定的英文技术标识，未来也可能有国际贡献者。

## Decision

简体中文是项目默认产品语言、文档语言和协作语言。`README.md`、`docs/`、AGENTS、Skill、Issue、PR 和 Web UI 默认使用中文。

代码标识符、文件名、包名、HTTP 字段、OpenAPI `operationId`、错误码、日志字段、环境变量和 Git 分支名保持英文。技术术语面向用户时使用中文优先，必要时首次附英文原词。

英文文档是辅助投影：提供 `README.en.md` 作为入口，但不要求每个内部文档在同一 PR 中维护完整英文副本。未来真正增加第二种 UI 语言时，再建立类型安全消息目录和 Locale 机制；只有一种语言时不预建空 i18n 框架。

## Alternatives considered

- **英文优先。** 拒绝：会让主要维护者依赖 AI 翻译表达复杂决策，容易丢失精度并抬高贡献门槛。
- **只允许中文，包括代码标识符。** 拒绝：破坏 TypeScript、OpenAPI、日志、CLI 和国际依赖生态的一致性。
- **从第一天强制中英文全量配对。** 拒绝：当前个人项目没有足够维护能力，容易产生大量过期翻译和双重事实来源。
- **立即引入完整 i18n 框架。** 拒绝：当前只有一个真实 Locale，没有第二消费者来证明抽象边界。

## Consequences

- 中文使用者获得更低的理解和贡献成本；
- 国际贡献者需要依赖英文入口、代码和自动翻译理解部分内部文档；
- 用户可见枚举不能直接显示英文内部值，需要中文映射；
- 新增第二语言必须单独设计翻译所有权、回退和格式化策略。

## Verification

- 根 `README.md`、贡献指南、AGENTS 和文档地图为中文；
- `README.en.md` 明确中文文档是当前事实来源；
- `apps/web/index.html` 使用 `lang="zh-CN"`；
- OpenAPI `operationId`、Error Code、环境变量和源码标识符保持英文；
- `pnpm docs:check` 检查中文优先的关键入口存在。
