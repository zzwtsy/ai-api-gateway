---
document_id: AIGW-SIMPLIFICATION-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 简化与熵控制

## 1. 原则

Vibecoding 的生成速度通常高于人工清理速度，因此仓库必须主动删除无主代码，而不是只设置“如何新增 Feature”。简化的目标是减少我们拥有的实现、测试、文档和兼容面，不是把复杂度藏进新 Wrapper。

## 2. 审计触发点

至少在以下时机执行简化审计：

- 一个纵向 Phase 完成；
- Alpha/Beta/正式版本发布前；
- 新增 Workspace Package、Registry、State Machine 或公开配置项前；
- `knip`、重复代码或模块图出现持续例外；
- 同一概念出现第二份缓存、投影或状态来源；
- Postmortem 指出原有抽象妨碍真实入口验证。

## 3. 强候选证据

- 公开方法、配置项、事件或类型没有生产消费者；
- 只有测试/文档引用，且行为不是兼容承诺；
- 两个耐久或内存表示镜像同一事实；
- 一个 Repository/Package 只有单一调用方且没有独立发布或替换需求；
- Feature 提前实现了没有当前产品所有者的通用性；
- 手写 Parser、Retry、Glob 或加密包装可由健康依赖或 Node 内置完整替代，并能净删除代码；
- Gate、Fixture 或 Decision 只保护已经删除的行为；
- 生成文件和维护源同时被手工编辑。

`knip` 和 `jscpd` 只提供候选，不能替代生产调用方和动态加载路径分析。

## 4. 不应删除的证据

- 当前生产入口或真实 Fixture 消费；
- 现行 Decision 明确保护的负向保证；
- 数据库/Wire/导出格式兼容义务；
- 取消、回滚、首字节边界、Secret 或 Shutdown 所需的独立所有者；
- 仅在构建产物、动态注册或配置加载时可见的入口。

## 5. 工作流

```text
change-scope
→ 搜索精确 Symbol/配置/Wire 字符串
→ 区分生产、测试/文档、动态入口消费者
→ 阅读拥有该行为的 Decision/Postmortem
→ 计算净删除面
→ 小型清理直接实现；长期取舍写 proposed Decision
→ 删除代码、测试、文档、生成物和过期 Note 引用
→ 运行 hygiene + 受影响行为证据 + Artifact Smoke
```

## 6. 工具

```bash
pnpm hygiene
pnpm knip
pnpm duplication
pnpm docs:module-graph:check
```

所有例外必须窄、可解释并靠近目标文件。禁止为快速过 Gate 全局提高阈值、忽略整个目录或添加永久 Allowlist 而不说明真实消费者。
