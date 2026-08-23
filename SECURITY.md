# 安全策略

AI API Gateway 会处理 Provider Credential、Gateway Client Key 和可能包含敏感内容的模型请求。请不要在公开 Issue、Discussion 或 Pull Request 中披露真实 Secret、完整请求正文或可复现的私人数据。

## 报告安全问题

当前项目仍处于早期个人维护阶段，尚未建立独立安全邮箱。发现安全问题时，请先通过 GitHub 私密安全报告功能提交；若仓库未启用该功能，请只创建不包含利用细节的公开 Issue，并请求维护者建立私密沟通渠道。

## 当前安全边界

- Gateway Client Key 应只保存哈希或 HMAC；
- Provider Credential 必须加密存储；
- 完整 Secret 只允许在创建或轮换完成时显示一次；
- Secret 不得进入日志、Trace、Fixture、Snapshot、OpenAPI Example、URL 或默认导出；
- 控制面身份、Gateway Client Key 和 Provider Credential 是三类不同凭据；
- 数据面不得把浏览器 Cookie、控制面令牌或 Gateway Key 转发给上游；
- 生产启动必须拒绝开发假凭据和弱主密钥。

详细规则见 [`docs/conventions/security-and-secrets.md`](docs/conventions/security-and-secrets.md)。
