---
name: simplification-audit
description: 在阶段收口、发布前或出现重复抽象时，基于真实消费者审计并删除代码熵。
---

# 简化审计

先读：

1. `docs/conventions/simplification-and-entropy-control.md`
2. `docs/conventions/defensive-patterns.md`
3. 受影响模块的 Decision Note 和最近测试

工作流：

1. 用 `pnpm change-scope --base <confirmed-base>` 确认当前改动；
2. 搜索精确 Symbol、配置项、Error Code、Wire 字符串和动态入口；
3. 区分生产消费者、测试/文档消费者和构建/配置消费者；
4. 用 `pnpm knip`、`pnpm duplication` 和模块图发现候选，但不把工具结果直接当删除结论；
5. 计算净删除面：实现、专用测试、文档和兼容行为减去剩余 Glue；
6. 小型局部清理直接实施；改变长期边界或公开行为时先写 proposed Decision Note；
7. 同时删除过期测试、文档、生成物和 Decision 引用；
8. 运行 `pnpm hygiene`、受影响行为 Gate 和必要的 Artifact Smoke。

禁止：

- 因为“看起来复杂”就删除取消、回滚、首字节边界或 Secret 所有者；
- 把动态加载、构建产物或配置入口误判为无消费者；
- 通过全局 Ignore、永久 Allowlist 或提高阈值制造绿色结果；
- 引入一个 Wrapper 后保留几乎相同的自有复杂度并宣称完成简化。
