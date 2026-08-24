---
status: normative
last_reviewed_at: 2026-08-24
language: zh-CN
---

# 客户端页

![客户端页](assets/clients.png)

## 1. 页面目标

每个 Harness 实例使用独立 Gateway Client Key。客户端页用于创建身份、限制路由范围、生成一次性 Key 和 Harness 配置，并独立归因成本与稳定性。

## 2. 主表格

核心列：

- 客户端；
- 协议；
- Gateway Key 数；
- 路由范围；
- 24h 请求；
- 累计费用；
- 最后使用；
- 状态。

每行代表一个具体实例，例如 `Codex · Arch` 与 `Codex · Windows` 分开，而不是只按 Harness 类型合并。

## 3. 创建客户端

使用居中 Dialog，步骤保持短：

1. 名称；
2. Harness Profile；
3. 确认由 Profile 派生的入口协议；
4. 创建。

Dialog 使用真实 Trigger 恢复关闭后的焦点，并持续提供“取消 / 创建客户端”Footer。选择 Profile 后，在表单内显示只读 Profile 摘要和允许协议，不增加第二个协议输入。加载、错误和提交状态都保留在 Dialog 内；服务端失败不清空名称或 Profile。

入口协议由 Harness Profile 的允许协议派生，并在目录中单独以 Badge 只读展示，不重复显示 Harness 名称，也不与 Profile 形成第二个可编辑状态。名称最多 100 个字符；目录中超长名称单行截断，并通过悬停标题显示完整值，不能挤压状态 Badge。

创建完成后进入独立居中完成 Dialog，展示：

- 一次性完整 Gateway Key；
- 复制按钮；
- Gateway Base URL；
- 生成的 Harness 配置；
- 发送测试请求；
- 安全说明。

关闭后完整 Key 无法再次查看。必须要求用户确认已复制，或允许立即下载仅含该 Key 的一次性安全文件，但普通导出永不包含完整 Key。

## 4. 客户端详情 Sheet

包含：

- 基本信息；
- Gateway Key 列表与状态；
- 路由范围；
- 生成配置；
- 最近请求；
- 使用量和费用；
- Key 轮换、撤销、禁用。

## 5. Key 轮换

推荐无中断流程：

```text
创建新 Key
→ 在 Harness 中替换
→ 发送测试请求并确认新 Key 生效
→ 撤销旧 Key
```

撤销前显示最近使用时间、来源客户端和影响。Key 泄露时提供“立即撤销并打开该客户端请求”动作。

轮换和撤销都必须先打开确认 Dialog。确认轮换前不创建新 Key；确认成功后新 Key 才立即生效，旧 Key 进入 24 小时重叠窗口。详情默认只展示可用 Key 摘要，历史 Key 折叠，避免轮换次数持续增加目录高度。

## 6. 安全显示

- 列表只显示前缀与后 4 位；
- 复制完整 Key 仅存在于创建/轮换完成状态的居中 Dialog 中；
- 诊断、CSV、备份和截图不包含完整 Key；
- Gateway Client Key 不用于登录控制面；
- Provider Credential 不出现在客户端页。

## 7. 禁用

禁用客户端后，新请求立即拒绝；历史请求与分析保持可查。界面必须说明禁用影响，而不是只切换 Switch。

## 8. 当前交付

当前页面交付带只读 Profile 摘要和明确 Footer 的客户端创建 Dialog、目录摘要、由 `clientId` 控制的客户端详情 Sheet，以及轮换/创建后的一次性 Secret 居中 Dialog。无效 `clientId` 会从 URL 删除，不自动选择首个客户端；详情可在刷新后恢复，并集中展示基本信息、可用 Key 摘要、折叠历史 Key、确认轮换、确认撤销和配置入口。

详情生成按入口协议匹配的 Cursor、Codex CLI、Claude Code 或 cURL 配置模板，模板只包含 `YOUR_GATEWAY_CLIENT_KEY` 占位符。Gateway 无法从已保存摘要恢复现有完整 Key；用户可显式轮换 Key，并在一次性完成态复制新 Key 与完整配置。轮换完成态关闭后返回原客户端详情，创建完成态关闭后返回列表。

完整 Key 只保存在当前页面内存，创建或确认轮换 mutation 成功后立即清除其内部状态，既不进入 URL，也不进入浏览器持久化；关闭完成态后不可恢复。已超过 `expiresAt` 的 `expiring` Key 在认证和可用数量中都视为不可用。路由范围、客户端禁用、最近请求、成本统计、发送测试请求和完整的 Profile 驱动配置生成器尚未交付。
