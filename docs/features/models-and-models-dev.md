---
document_id: AIGW-MODEL-001
status: normative
last_reviewed_at: 2026-08-24
language: zh-CN
---

# 模型目录与 models.dev 集成

## 1. 目标

模型目录需要同时回答：

- 某个 Endpoint 实际接受哪些模型 ID；
- 某模型的上下文、输出上限和能力是什么；
- 哪些信息来自 models.dev、厂商文档、Probe 或手动覆盖；
- 价格是什么、何时生效；
- 某个模型是否适合某 Harness Profile；
- 路由中的客户端模型名最终会映射到哪个上游模型。

模型目录不负责运行时“自动选择最佳模型”。

## 2. 两层模型

```text
ModelDefinition
  与 Endpoint 无关的基础模型概念

ProviderModelBinding
  某个具体 Endpoint 接受的实际模型 ID
```

示例：

```text
ModelDefinition: GLM-5.2
├── 智谱通用 Chat / glm-5.2
├── 智谱 Coding Plan Chat / GLM-5.2
└── 智谱 Anthropic / glm-5.2[1m]
```

三个 Binding 的协议、模型 ID、上下文、套餐价格和兼容性可以不同。

## 3. 数据来源与字段来源

每个可覆盖字段保存 Provenance：

```text
value
source_type        manual | probe | provider_models | provider_docs | models_dev_provider | models_dev_base
source_ref
source_version
observed_at
confirmed_by_user
```

字段优先级：

```text
manual
> endpoint/account override
> probe
> provider docs
> models.dev provider model
> models.dev base model
> unknown
```

注意：Probe 只应覆盖可测事实，例如 Endpoint 是否接受某字段；不应覆盖厂商合同价格，除非响应明确报告价格。

## 4. models.dev 定位

models.dev 是开放模型元数据目录，提供 Provider、Model ID、价格、上下文、模态、Reasoning、Tool Call、Structured Output 等信息。系统只把它作为**预填来源**：

- 不作为运行时可用性证明；
- 不自动创建路由；
- 不覆盖手动字段；
- 不把模糊匹配结果自动应用；
- 不假设同一基础模型在不同 Provider 上能力完全一致。

## 5. 同步流程

```text
定时请求 https://models.dev/api.json
→ 使用 ETag / Last-Modified（若有）
→ 校验 JSON 结构与大小
→ 计算 content_hash
→ 保存不可变 Snapshot
→ 生成差异
→ 更新非手动字段的候选值
→ UI 提示待确认的重要价格变化
```

建议：

```text
同步周期：24 小时
请求超时：30 秒
最大响应大小：受控，例如 20 MB
保留 Snapshot：最近 10 个或 90 天
失败策略：继续使用最后一个有效 Snapshot
```

## 6. 模型发现与匹配

### 6.1 上游模型发现

如果 Endpoint 提供标准模型列表，可以通过显式“同步模型”操作获取。不同 Harness 可能需要不同格式：

- 通用 OpenAI `/models`；
- Codex `/models?client_version=...`；
- 厂商自定义模型列表；
- 不支持列表时手动添加。

### 6.2 自动匹配

只有以下情况自动匹配：

```text
本地 Provider 映射到明确 models.dev provider ID
且 upstream_model_id 与 models.dev model ID 精确相等
```

其他情况只给候选：

```text
大小写差异
日期后缀
[1m] 后缀
命名空间前缀
兼容别名
```

用户确认后保存显式映射，不在每次同步时重复模糊匹配。

## 7. 价格预填

models.dev 的价格通常按每百万 Token 美元金额表达。系统读取可用字段：

```text
input
output
reasoning
cache_read
cache_write
input_audio
output_audio
```

预填后在 UI 显示来源：

```text
输入价格    $1.20 / 1M    models.dev · 2026-08-20
输出价格    $4.80 / 1M    手动覆盖
```

价格变化不立即改写历史 Request/Attempt，只影响新 PricingSnapshot。

## 8. 能力模型

能力状态不能只有 Boolean：

```text
supported
partial
ignored
unsupported
degraded
unknown
```

建议字段：

```text
text_input
image_input
audio_input
file_input
text_output
tool_call
parallel_tool_call
custom_tool
structured_output
json_schema
reasoning
reasoning_summary
web_search
prompt_cache
streaming
```

由于系统不进行视觉路由，`image_input` 只用于提示。

## 9. Harness Compatibility 与模型能力的区别

```text
ProviderModelBinding Capability
  模型/Endpoint 对字段或能力的支持

HarnessCompatibilityProfile
  整体是否适合作为 Codex、Claude Code 等目标
```

例如一个 Endpoint 支持 Responses 文本和 Function Tool，但不支持 Codex 需要的 Custom Tool，则：

```text
openai_responses capability = partial
codex compatibility = partial 或 blocked
```

## 10. 模型目录给 Codex 的输出

Codex 的模型目录包含比标准 OpenAI `/models` 更丰富的信息，例如 Reasoning Level、Context Window、Tool 配置和输入模态。Gateway 不应把普通 OpenAI `data[]` 模型列表直接返回给 Codex。

`/codex/models` 应由本地配置生成，只暴露：

- 用户希望在 Codex 中显示的客户端模型名；
- 与当前 Codex 版本兼容的模型元数据；
- 不会诱导 Codex 发送上游不支持的 Tool 模式；
- `client_version` 作为兼容判断输入；
- ETag 用于缓存。

若暂未实现完整 Codex 目录，MVP 可以要求用户在 Codex 中手动配置模型，并将 `/codex/models` 标记为后续阶段；但不能返回错误格式。

## 11. 生命周期

模型状态：

```text
unverified
available
deprecated
unavailable
hidden
```

- deprecated：仍可路由，但 UI 警告；
- unavailable：不能作为新 RouteTarget；
- hidden：不出现在选择器，但历史仍可查看；
- Provider `/models` 不再返回某模型时，不自动删除，先标记“未发现”。

## 12. UI 工作流

### 新增模型

```text
发现上游模型
→ 精确匹配 models.dev
→ 预填元数据
→ 显示字段来源
→ 用户确认
→ 保存 ProviderModelBinding
```

### 价格变化

```text
旧值 vs 新值
影响的新请求
来源与更新时间
[应用] [保留当前] [手动覆盖]
```

### 能力冲突

```text
models.dev: tool_call = supported
Probe: function tool = failed
```

UI 应显示冲突并默认采用 Probe 作为 Endpoint 实测事实，同时保留两条证据。

## 13. 验收条件

- 精确匹配可自动预填；
- 模糊匹配不会自动应用；
- 手动值不会被同步覆盖；
- 字段可显示来源和更新时间；
- 价格变化不会修改历史费用；
- models.dev 不可用时现有模型仍可使用；
- 模型能力不触发自动视觉路由；
- Codex 模型目录与标准 OpenAI 模型列表分开。

## 14. 当前实现边界

当前控制面提供 Endpoint 级 `ProviderModelBinding` 列表和显式创建。创建前验证 Endpoint 存在，相同 Endpoint 与上游模型 ID 不可重复；新记录固定为 `unverified`。Web 明确显示能力与价格未知，不把缺失数据表示为零或可用。

创建表单可通过 `discoverUpstreamModels` 显式读取 OpenAI-compatible 模型目录。用户选择 Endpoint、绑定的可用 Credential 和模型目录路径后，Gateway 返回去重排序的模型 ID；选择模型只预填上游模型 ID 与空白显示名称，失败时保留手工输入。该操作不持久化目录、不自动批量创建绑定，也不解析厂商私有格式。

ModelDefinition、models.dev 同步、字段 Provenance、能力矩阵、PricingRule、耐久模型同步、详情编辑和状态 Probe 尚未实现。
