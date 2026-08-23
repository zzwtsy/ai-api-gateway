---
status: active
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 文档系统约定

## 单仓库，多投影

源码、当前规范、Decision Note、Agent 规则和测试位于同一个 Git 仓库。仓库只维护一套模块化事实来源，发布时从同一 Commit 生成不同投影：

```text
Git Commit / Tag
├── 源码归档
├── 中文完整规范
├── 工程规范
├── 前端规范
├── OpenAPI
└── Docker Image
```

禁止再维护一个独立“设计规范项目”和一个独立“项目模板”，也禁止为同一行为维护不同版本号。

## 文档职责

- `product/`：为什么做、为谁做、什么不做；
- `architecture/`：当前和目标系统如何组成；
- `features/`：用户可感知能力和业务状态；
- `conventions/`：当前开发必须如何执行；
- `decisions/`：为什么选择某个长期方案以及放弃什么；
- `roadmap/`：未完成工作的建议顺序；
- `references/`：外部事实、设计样例和协议材料；
- `plans/`：临时实施计划，完成后不作为当前事实。

## 生成规范

`docs/spec-bundles.json` 声明三个投影顺序：

- 完整产品与工程规范；
- 工程规范；
- 前端规范。

运行：

```bash
pnpm docs:bundle
```

输出到 `.artifacts/spec/`。生成文件顶部包含项目版本和 Git Commit；不得手工修改，也不作为另一个事实来源提交到活动文档目录。

## 同步规则

- API 字段不在 Markdown 重复维护，引用 `operationId`；
- 数据库列不在 Feature 文档重复维护，引用 Schema/Migration；
- UI Token 以 `docs/product/ux/design-tokens.json` 和 Web Theme 为准；
- 修改目录、脚本或命令时同步 AGENTS、Skill 和文档链接；
- 旧规范由 Git Tag 保存，不在 `docs/old`、`docs/v0.x` 中保留活动副本；
- `pnpm docs:check` 必须验证链接、命令引用、规范清单和旧路径残留。
