---
name: postmortem
description: 当缺陷逃逸到真实入口、发布产物或用户环境时，完成证据化复盘并建立永久 Guard。
---

# 事故复盘

使用 `docs/postmortems/_template.md`，只记录经过复现、日志、测试或提交确认的事实。

必须完成：

1. 说明真实影响和未发生的影响；
2. 找到被破坏的运行时关系和实际执行路径；
3. 解释现有 Typecheck、Unit、Fixture、Artifact 或 CI 为什么没有捕获；
4. 添加最接近真实入口且无 Secret 依赖的回归场景；
5. 将根因转化为局部 AGENTS、Convention、Decision 或运行时不变量；
6. 重新引入最小缺陷，证明新测试/Gate 变红，再恢复修复并记录命令；
7. 运行 `pnpm evidence:select --base <confirmed-base>` 给出的证据。

复盘不保存推理流水账，不把“增加更多测试”作为没有明确失败面的行动项，也不把个人归因为根因。
