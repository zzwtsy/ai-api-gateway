---
document_id: AIGW-SEC-001
status: normative
last_reviewed_at: 2026-08-24
language: zh-CN
---

# 安全与密钥设计

## 1. 威胁模型

主要风险：

- Provider API Key 泄露；
- Gateway Client Key 泄露；
- Raw Prompt/Response 包含隐私；
- 自定义 Endpoint 导致 SSRF；
- 日志或错误输出 Secret；
- Web UI 被局域网其他用户访问；
- 数据库备份包含可解密 Secret；
- Header 透传导致客户端控制上游鉴权；
- Regex 路由和超大 Body 导致资源耗尽。

系统面向个人使用，但不能假设局域网或主机上所有进程可信。

## 2. Gateway Client Key

- 生成使用 CSPRNG；
- 至少 256 bit 随机熵；
- 数据库只保存哈希；
- 完整值仅创建时展示；
- 日志只显示 Prefix + Last4；
- 支持轮换、过期和撤销；
- 比对使用常量时间函数；
- API 返回 Key 后设置 `Cache-Control: no-store`。

## 3. Provider Credential 加密

### 3.1 Envelope

推荐：

```text
Master Key（环境变量或挂载文件）
→ 派生/选择 Data Encryption Key
→ AES-256-GCM 加密每个 Credential
```

保存：

```text
ciphertext
nonce
algorithm
key_id
auth_tag（若库未包含在 ciphertext）
fingerprint
```

AAD 应包含：

```text
credential_id
provider_id
account_id
```

防止密文被错误移动到其他记录。

### 3.2 主密钥

- 不存数据库；
- 通过只读 Secret 文件或环境变量提供；
- 启动时缺失则拒绝运行；
- 不输出到日志；
- 备份时单独处理；
- 支持 `key_id` 以便未来轮换。

## 4. UI Secret 处理

- Provider Key 输入框不回填完整值；
- 编辑时留空表示不修改；
- 复制完整 Provider Key 默认不支持；
- Gateway Client Key 只创建时可复制；
- 页面离开后清除前端内存中的明文；
- 成功响应不在浏览器持久缓存 Secret；
- 任何截图和诊断导出默认掩码。

## 5. 日志脱敏

结构化 Logger 在最外层统一 Redact：

```text
authorization
x-api-key
cookie
set-cookie
proxy-authorization
*.apiKey
*.token
*.secret
*.encryptedSecret
```

同时对 Provider 自定义认证 Header 建动态 Redact 集合。

不能依赖每个调用点手工脱敏。

## 6. Raw Payload 隐私

默认模式 `truncated`，UI 第一次启用 `full` 时提示：

- Prompt、代码、文件片段和个人数据将被保存；
- 日志保留时间；
- 备份是否包含；
- 谁可以访问 Web UI；
- 如何清理。

允许配置 JSON Pointer Redaction 和按 GatewayClient 禁用 Payload。

## 7. Admin Web 认证

单用户仍需要管理界面保护。推荐 MVP：

- 初始化时创建本地管理员密码或 Passkey；
- Session Cookie：HttpOnly、Secure、SameSite=Strict；
- CSRF 防护；
- 登录限速；
- 支持绑定到 localhost；
- 远程访问建议经 Tailscale/VPN 或受保护 Reverse Proxy。

不要复用 Gateway Client Key 登录 Web UI。

## 8. SSRF 防护

自定义 Endpoint：

- 只允许 `https`，开发模式可允许 `http`；
- 解析 DNS 后检查私有地址策略；
- 默认阻止云 Metadata 地址、localhost 和 link-local，除非用户显式允许本地模型；
- 重定向后重新验证目标；
- 限制端口或要求确认；
- Base URL 保存时测试；
- 不允许请求体/Query 动态控制 Host。

因为本产品需要访问本地服务，私网阻止不能硬编码；应通过“允许本地 Endpoint”高级设置明确开启。

## 9. Header 注入

- Header 名和值进行语法校验；
- 禁止 CR/LF；
- 禁止修改 Host、Content-Length、Transfer-Encoding；
- 认证 Header 由 auth_scheme 独占；
- 客户端自带的认证 Header 在路由前删除；
- 自定义 Header 的 Secret 值使用 Secret 引用，不直接存普通 JSON。

## 10. Body/Regex 资源限制

- 最大请求体；
- 最大 Raw Payload；
- JSON 解析超时/深度限制；
- Regex 保存时编译，限制长度和危险表达式；
- SSE 单事件最大尺寸；
- Header 总大小；
- 管理 API 分页上限。

## 11. 数据库与备份

- PostgreSQL 仅内网或本机可访问；
- 使用独立数据库账号；
- 迁移前备份；
- 导出默认不含 Provider Secret；
- 含 Secret 的加密备份需要二次确认；
- 备份文件权限 0600；
- 删除 Secret 后提供 Vacuum/备份轮换建议。

## 12. 审计日志

记录：

```text
admin login
Provider Credential 创建/轮换/禁用/删除
Gateway Client Key 创建/轮换/撤销
Route 发布/回滚
日志策略修改
价格手动覆盖
备份导出
```

审计日志不保存 Secret，只保存 Actor、动作、对象、时间和变更摘要。

## 13. 上游 TLS

- 默认验证证书；
- 自签名 CA 通过受控 CA Bundle 配置；
- 禁止“忽略所有 TLS 错误”作为普通 UI 开关；
- 连接错误中不输出认证 Header；
- 可记录证书主机名和错误类型。

## 14. 验收条件

- 数据库无明文 Gateway Key；
- 数据库无明文 Provider Key；
- 日志无认证 Header；
- Gateway Key 创建响应不缓存；
- Header 注入无法包含换行；
- 自定义 Endpoint 有 SSRF 检查；
- 导出默认不含 Secret；
- Raw Payload Full 模式有明确风险确认；
- 首次启动缺少 Master Key 时失败关闭。

## 15. 当前密钥实现

Provider Credential 使用版本化 AES-256-GCM Envelope，Credential ID 与 Key ID 作为 AAD；配置显式声明 Keyring 和 Active Key，写入只使用 Active Key，读取按记录的 Key ID 选择。旧 Key 在相关密文全部重加密前必须保留。Fingerprint 使用独立 Pepper 的 HMAC-SHA-256，只用于重复检测，不用于解密。

Gateway Client Key 使用 256 bit CSPRNG，数据库保存带 Pepper 的 HMAC-SHA-256、Prefix 和 Last4。完整 Key 只在创建和轮换响应出现一次，这两个响应必须使用 `Cache-Control: no-store`。实现取舍见 [Provider Secret Keyring 与 Gateway Client Key 持久化](../decisions/implemented/2026-08-24-durable-secret-and-gateway-key-storage.md)。

PostgreSQL Bootstrap 只创建缺失的 Credential 与 Client。已有记录存在时，启动过程不得用环境变量覆盖密文、HMAC、状态、撤销或轮换结果；否则环境配置会成为绕过耐久安全状态的第二事实来源。
