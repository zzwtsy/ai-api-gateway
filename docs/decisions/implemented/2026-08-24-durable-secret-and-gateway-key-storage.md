---
status: normative
last_reviewed_at: 2026-08-24
language: zh-CN
---

# Decision: Provider Secret Keyring 与 Gateway Client Key 使用不同的耐久存储

Status: implemented

## Problem

数据面需要取回 Provider Credential 调用上游，但 Gateway Client Key 只用于认证 Harness，不应可恢复。若两类 Secret 共用明文、可逆加密或同一 Hash 流程，数据库泄露、备份处理、轮换和运行时读取都会获得不必要的权限。单一无标识主密钥也无法在不停机迁移全部 Credential 的情况下轮换。

## Decision

Provider Secret 使用 Node.js 原生 `crypto` 的 AES-256-GCM。密文 Envelope 保存版本、随机 96-bit IV、128-bit 认证标签和 Ciphertext；数据库同时保存 `secret_key_id`。Credential ID 与 Key ID 组成 AAD，防止密文被移动到其他 Credential 或错误 Key 上解密。配置以显式 Keyring 提供多个 256-bit Key，并指定 Active Key：新写入只使用 Active Key，读取按记录 Key ID 选择。独立 Pepper 的 HMAC-SHA-256 Fingerprint 用于重复检测，Masked Display 只保留末四位。

Gateway Client Key 使用 256-bit CSPRNG 生成。数据库只保存带服务器 Pepper 的 HMAC-SHA-256、Prefix 和 Last4，认证先按 Prefix 缩小候选，再使用常量时间比较验证。完整 Key 只在创建或轮换响应出现一次，响应设置 `Cache-Control: no-store`；列表、日志、错误和普通导出永不返回完整值。

轮换 Gateway Key 时只把当前 `active` Key 改为 `expiring` 并设置有限重叠窗口，历史 `revoked` Key 保持原状态。Provider Secret 轮换替换同一 Credential 的密文并恢复为 `unverified`，随后由用户显式 Probe。

## Alternatives considered

- **两类 Secret 都保存明文。** 拒绝：数据库、备份和只读查询获得完整上游与客户端权限。
- **两类 Secret 都只保存不可逆 Hash。** 拒绝：Provider Credential 必须在运行时恢复后发送给上游。
- **Gateway Client Key 使用 Argon2id。** 适合低频人类密码，但 Gateway Key 已有高熵且认证位于请求热路径；带 Pepper 的 HMAC 可索引且验证成本更可控。
- **只配置一个无 Key ID 主密钥。** 拒绝：主密钥轮换需要同时重写所有密文，失败时缺少安全的渐进迁移和回滚边界。
- **把 Keyring 放入数据库。** 拒绝：数据库泄露会同时提供密文和解密材料，失去分离价值。

## Consequences

删除旧 Provider Key 前必须证明已没有密文引用它；数据库备份和 Keyring 备份需要分别保护。丢失 Keyring 会使对应 Provider Credential 不可恢复，丢失 Gateway Pepper 会使现有客户端 Key 全部失效。Gateway 完整 Key 不可找回，只能轮换。Fingerprint 和 Gateway HMAC 使用不同 Pepper，避免跨用途关联。

当前 AAD 绑定 Credential ID 与 Key ID；Provider 与 Account 所有权由外键和事务保证。若未来允许跨 Account 移动 Credential，必须先定义密文重加密语义，不能直接移动记录。

PostgreSQL 启动只在 Bootstrap Credential 或 Client ID 缺失时用环境变量创建耐久记录。已有 ID 表示数据库已经取得所有权，启动过程不得覆盖或补回其密文、HMAC、轮换和撤销状态。

## Verification

- `apps/gateway/src/core/crypto/secret-cipher.test.ts` 覆盖加解密、AAD、历史 Key 和篡改失败；
- `apps/gateway/src/core/crypto/gateway-key.test.ts` 覆盖随机 Key、Prefix、HMAC 和验证；
- `apps/gateway/src/control-plane/features/clients/service.test.ts` 证明 Repository 不保存完整 Key；
- `apps/gateway/src/control-plane/features/connections/service.test.ts` 证明控制面聚合和 Probe 结果不暴露 Provider Secret；
- `apps/gateway/tests/integration/postgres.test.ts` 证明 Bootstrap 写入可重复执行且环境变量变化不覆盖既有耐久 Secret；
- `pnpm verify:secret-safety`；
- `pnpm check:control`；
- `pnpm check:data`；
- `pnpm check:artifact`。
