---
name: trim-authoring-residue
description: 在审查或修复 Markdown、JSDoc、注释、Prompt、诊断和可见字符串中的作者过程残留时使用；处理 PR/评审/设计稿视角、变更叙述、控制流讲解、无主计划和不可解析引用，同时保留当前合同与证据。
---

# 清理作者过程残留

作者过程残留是从“写这次改动的人”的视角，而不是从当前仓库读者的视角写成的文字。它引用只有当时会话可见的设计编号、PR 轮次和评审对话，叙述代码怎么改过，或用自然语言复述控制流。

修复不是机械删除。若段落包含事实，先按 [`documentation-review`](../documentation-review/SKILL.md) 的完整命题规则重述当前合同，再删除过程外壳；没有事实的审计编号、评审寒暄和明显代码复述可以直接删除。

## 判断问题

对每段可疑文字询问：

> 当前 `HEAD` 的读者在看不到聊天记录、PR 讨论、未提交设计稿或作者记忆的情况下，能否解析每个引用并验证每项主张？

不能时，改写为当前仓库可验证的事实，或链接到已提交的唯一拥有者。即使引用可解析，README、Convention、JSDoc 和当前 Architecture 中的变更故事仍应迁往 Decision、Postmortem、Issue 或 Git 历史。

## 分类

1. **不可解析的设计引用**：`decision 7`、`audit C2`、`T4`、`P1`、`设计稿 §4.2`、`上一版方案`。链接已提交的 Decision/Plan，或删掉编号并让事实独立成立。
2. **PR、Commit 与 Stack 视角**：`这个 PR 添加`、`后续 PR`、`前一个 Commit`、`本轮修改`。改写为已交付机制；延期工作进入有所有者的 `TODO`、Issue 或活动 Plan。
3. **变更叙述和时间戳**：`以前`、`不再`、`旧版`、`现在`、`目前这版`。当前事实表面写现在时；需要保留的回归依据改成现在时反事实，例如“没有 X 时会发生 Y”。
4. **评审过程**：`评审拒绝`、`Reviewer 确认`、`第 5 轮反馈`。保留最终决定和技术依据，删除是谁在何时说的。
5. **面向 Reviewer 的自我辩护**：`这个强转是安全的`、`这里显然正确`。改写为使代码安全的所有权、验证点或不变量；代码已经清楚时删除。
6. **控制流和测试讲解**：`先 A，再 B，最后 C`、逐行解释分支、测试点击步骤。删除；只有顺序不可交换并有后果时，改写为时序合同。
7. **含糊计划和缓和语**：`暂时够用`、`以后再说`、`大概没问题`。给出真实边界，或使用有所有者和退出条件的 `TODO`/`FIXME`；否则删除。
8. **写作语言残留**：中文文档中的无意义英文草稿片段、英文入口中的未翻译工作笔记、`---- 私有 ----` 等分隔。按表面语言翻译或删除；技术标识符不属于此类。
9. **手写状态库存**：`已完成 7/10`、测试文件清单、模块目录镜像、生成字段表。移动到临时 Plan，或由脚本/生成物拥有；当前文档只保留耐久规则。

## 不属于残留

- 可解析的 Issue、已合并 PR 和 `TODO(name)` 引用；
- Decision 的 `Alternatives considered` 和真实取舍；
- Postmortem 的时间线、证据和因果链；
- 活动 `docs/plans/` 内的阶段编号和实施顺序；完成后必须收口；
- Lint/Coverage 抑制、空 Catch 和兼容分支的必要理由；
- “没有 X 时 Y 会发生”的现在时回归依据；
- 带来源的测量值和上限；
- 运行时的旧/新对象，例如旧连接排空后新连接接管；
- RFC、标准章节、公开设计资源和已提交文档锚点；
- 代码标识符、协议名、Error Code 和日志字段中的英文。

“可解析”只说明不是死引用，不代表它放在正确位置。变更历史在 Decision、Postmortem、Issue 和 Git 中有家时，不应重复进当前事实文档。

## 工作流

1. 确认用户指定范围，或用已确认 Base 的 `change-scope` 获取范围；
2. 读取拥有代码、文档类型和 [`documentation-review`](../documentation-review/SKILL.md)；
3. 先只读运行 [召回探针](references/recall-batteries.md)，再人工阅读文字最密集的位置；探针命中不是缺陷结论；
4. 对每段枚举 Actor、Action、条件、时序、强度、否定保证、所有权、失败和后果；
5. 按“删除、现在时重述、链接拥有者、迁移到 Decision/Postmortem/Plan、保留”分类；
6. 先修改拥有源，再重新生成 Catalog、规范投影、Snapshot 或可见输出；
7. 用 [改写示例](references/examples.md) 检查过度删除；
8. 重跑探针，并逐项确认剩余命中属于允许情况；
9. 运行受影响表面的 Gate，报告明确修改、刻意保留和未决项。

## 排除与保护

- 不直接编辑 `.artifacts/`、`dist/`、Coverage、生成 API 类型、Route Tree、Fixture 或 Snapshot；修复拥有源后重新生成；
- 不“现代化”Postmortem 中作为证据保留的原始日志或引用；
- 不把 Prompt 和 UI 字符串静默润色：它们是行为变化，需要对应测试；
- 不因搜索结果数量设删除目标，也不为制造整洁而删除真实契约；
- 不把一个明确义务改写成模糊建议，不把假设性能力写成已交付能力。

## 验证

文档、AGENTS、Skill 或 Decision：

```bash
pnpm check:docs
git diff --check
```

可见字符串或 Prompt：

```bash
pnpm check:web
```

若修改属于协议、数据库或发布行为，增加对应 Gate；编辑检查不能替代行为证据。

本 Skill 参考 DeepSeek Harness `dsh-trim-cot-leakage`，已按本项目的中文事实来源和 Decision/Plan 体系重写；许可见 [Third-Party Notices](../THIRD_PARTY_NOTICES.md)。
