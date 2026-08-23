---
status: active
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 架构文档

本目录同时维护两类内容：

- **当前事实**：仓库结构、依赖边界、已经运行的两条黄金路径；
- **目标合同**：协议、路由、领域模型、安全和扩展方向。

发生冲突时，当前源码、测试和 Migration 优先；目标合同仍约束尚未实现部分不得走向错误方向。

入口：

- [系统架构](system-overview.md)
- [当前实现状态](current-implementation.md)
- [领域模型](domain-model.md)
- [数据面协议代理](data-plane-protocol-proxy.md)
- [路由引擎](routing-engine.md)
- [工程基础与技术栈](engineering-foundation.md)
- [仓库结构与依赖边界](repository-layout-and-dependency-boundaries.md)
- [风险与边界情况](risks-and-edge-cases.md)
