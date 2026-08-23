---
document_id: AIGW-RISK-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 风险与边界情况

## 1. “兼容”但静默忽略字段

风险：上游返回 200，但 `reasoning.summary`、`service_tier`、`prompt_cache_key` 等没有生效。

缓解：

- CompatibilityFact 使用 `ignored`；
- Route 保存时提示；
- Probe 检查语义结果；
- 不把 200 当完整兼容；
- 日志记录已知警告。

## 2. Harness 自身重试导致请求放大

风险：Codex/Claude Code 重试 × Gateway Attempt × 多 Key。

缓解：默认 Gateway Budget=2，429/5xx 保守重试，UI 显示每次 Attempt，配置生成器建议降低 Harness 重试。

## 3. 流开始后失败

风险：切换上游会拼接两个模型输出或重复 Tool Call。

缓解：首字节后禁止回退，记录 `stream_interrupted`。

## 4. 失败 Attempt 已产生费用

风险：只统计最终成功模型，低估成本。

缓解：每个 Attempt 独立 Usage/Cost，Request 汇总所有 Attempt。

## 5. Usage 缺失

风险：将未知当 0，错误显示“免费”。

缓解：状态 unknown/partial，Dashboard 显示未知数量。

## 6. models.dev 数据过时或错误

风险：错误能力、上下文或价格。

缓解：仅预填、字段来源、手动覆盖、Probe 优先、Snapshot/差异审核。

## 7. 同名模型语义不同

风险：`gpt-5.4` 作为客户端别名被误按 OpenAI 价格计费。

缓解：成本按 ProviderModelBinding；保存 requested/upstream/reported 三个模型名。

## 8. Provider 隐式模型映射

风险：传入未知 Claude 名称后厂商自动落到 Flash。

缓解：Gateway 主动写入明确上游模型 ID；记录上游报告模型；Probe 未知模型行为。

## 9. 模型名后缀被错误标准化

风险：删除 `[1m]`、日期或命名空间导致上下文/计费变化。

缓解：模型 ID 为不透明字符串；只做显式 Route 改写。

## 10. Codex 模型目录诱导错误 Tool 模式

风险：目录声明不正确会让 Codex 发送 Endpoint 不支持的 Custom Tool。

缓解：Codex Catalog 独立维护；仅声明已验证能力；版本化 Fixture。

## 11. Raw Payload 数据膨胀

风险：数据库快速增长、备份过大、隐私暴露。

缓解：默认截断、分离存储、保留策略、大小上限、清理预警。

## 12. 自定义 Endpoint SSRF

风险：请求云 Metadata、内网服务或恶意重定向。

缓解：协议/地址校验、重定向复验、本地 Endpoint 显式开关。

## 13. Master Key 丢失

风险：上游 Credential 无法解密。

缓解：首次配置要求备份、启动检查、Key ID、备份文档。系统无法恢复丢失的 Master Key，应诚实提示重新录入 Secret。

## 14. PostgreSQL 不可用

风险：代理请求无法审计或路由配置不可读。

MVP：fail closed。未来可设计短时缓存，但需明确审计和一致性风险。

## 15. 多标签页并发编辑

风险：后保存覆盖先保存。

缓解：资源 version、If-Match、409 冲突、显示差异。

## 16. Probe 产生费用或副作用

风险：大量 Tool/长输出 Probe 计费。

缓解：最小 Fixture、预算、显式触发、记录成本、禁止自动遍历全部模型。

## 17. 客户端取消误判 Provider 错误

缓解：监听下游 Abort，分类 client_cancelled，从 Provider 错误率排除。

## 18. 系统时钟不准

风险：延迟、价格生效和冷却错误。

缓解：使用单调时钟计算时长，UTC wall clock 记录事件；部署提示 NTP。

## 19. Regex ReDoS

缓解：限制长度、预编译、优先 Glob、可选安全 Regex 引擎、保存时测试。

## 20. 过度 UI 自动化

风险：自动保存路由/价格造成不可见行为变化。

缓解：高风险显式保存、预览、发布状态、审计日志。

## 21. Provider 文档变化

兼容性文档必须视为时间快照。UI 显示：

```text
来源
验证日期
模型
Gateway/Harness 版本
是否已过期
```

## 22. 范围膨胀

容易进入的方向：协议转换、智能模型选择、多模态编排、企业租户。

缓解：任何改变核心边界的需求先写 ADR，并说明为什么现有确定性模型不足。
