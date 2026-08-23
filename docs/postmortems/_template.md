---
status: template
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Postmortem: <事故标题>

Status: resolved | monitoring

## Executive summary

一句话说明影响、根因和永久措施。

## Impact

列出真实用户/数据/可用性影响和未发生的影响。

## Detection

说明由真实入口、用户、监控还是测试发现。

## Timeline

只记录经过日志、提交、测试或复现确认的关键节点。

## Root cause

说明被破坏的运行时关系和具体执行路径。

## Why existing evidence missed it

分别分析 Typecheck、Unit、Integration、Snapshot、Artifact 和 CI 中真正存在的缺口。

## Corrective changes

- 直接修复；
- 真实入口或发布路径测试；
- 新增/更新不变量；
- AGENTS/Convention/Decision 更新；
- 监控、迁移或清理。

## Guard proof

记录重新引入缺陷后哪个测试/Gate 变红，以及恢复修复后的结果。

## Follow-up

仅保留有 Owner 和验证方式的后续工作。
