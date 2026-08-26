import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

import { createConnectionServiceTestContext } from "../../../../tests/support/connection-service-test-context.js";
import { SecretCipher } from "../../../core/crypto/secret-cipher.js";

const now = new Date("2026-08-23T00:00:00.000Z");
const cipher = new SecretCipher({ activeKeyId: "test-v1", keys: { "test-v1": Buffer.alloc(32, 4).toString("base64") }, fingerprintPepper: "provider-fingerprint-pepper-for-test" });
const unusedProber = { probe: async () => ({ classification: "healthy" as const, statusCode: 200 }) };

describe("ConnectionService batch creation", () => {
  it("creates a 2x2 aggregate and preserves explicit request-local bindings", async () => {
    const { service } = createConnectionServiceTestContext(cipher, { now: () => now }, unusedProber);

    const created = await service.create({
      name: "批量连接",
      providerSlug: "batch-provider",
      endpoints: [
        { ref: "chat-endpoint", name: "Chat", protocol: "openai-chat", baseUrl: "https://batch.example", requestPath: "/v1/chat/completions", authScheme: "bearer", supportsStreaming: true, credentialRefs: ["account-a-key", "account-b-key"] },
        { ref: "responses-endpoint", name: "Responses", protocol: "openai-responses", baseUrl: "https://batch.example", requestPath: "/v1/responses", authScheme: "bearer", supportsStreaming: true, credentialRefs: ["account-a-key"] },
      ],
      accounts: [
        { ref: "account-a", name: "账号 A", billingMode: "metered", credentials: [{ ref: "account-a-key", name: "Key A", secret: "batch-secret-a" }] },
        { ref: "account-b", name: "账号 B", billingMode: "subscription", credentials: [{ ref: "account-b-key", name: "Key B", secret: "batch-secret-b" }] },
      ],
    });

    expect(created.endpoints).toHaveLength(2);
    expect(created.accounts).toHaveLength(2);
    expect(created.accounts[0]?.credentials[0]?.endpointIds).toHaveLength(2);
    expect(created.accounts[1]?.credentials[0]?.endpointIds).toHaveLength(1);
    expect(JSON.stringify(created)).not.toContain("account-a-key");
    expect(JSON.stringify(created)).not.toContain("batch-secret-a");
  });

  it.each([
    ["duplicate endpoint ref", {
      endpoints: [
        { ref: "same-endpoint", name: "Chat", protocol: "openai-chat" as const, baseUrl: "https://refs.example", requestPath: "/v1/chat/completions", authScheme: "bearer" as const, supportsStreaming: true, credentialRefs: ["key"] },
        { ref: "same-endpoint", name: "Responses", protocol: "openai-responses" as const, baseUrl: "https://refs.example", requestPath: "/v1/responses", authScheme: "bearer" as const, supportsStreaming: true, credentialRefs: ["key"] },
      ],
      accounts: [{ ref: "account", name: "账号", billingMode: "unknown" as const, credentials: [{ ref: "key", name: "Key", secret: "duplicate-ref-secret" }] }],
    }],
    ["dangling credential ref", {
      endpoints: [{ ref: "endpoint", name: "Chat", protocol: "openai-chat" as const, baseUrl: "https://dangling.example", requestPath: "/v1/chat/completions", authScheme: "bearer" as const, supportsStreaming: true, credentialRefs: ["missing-key"] }],
      accounts: [{ ref: "account", name: "账号", billingMode: "unknown" as const, credentials: [{ ref: "key", name: "Key", secret: "dangling-ref-secret" }] }],
    }],
    ["unbound credential", {
      endpoints: [{ ref: "endpoint", name: "Chat", protocol: "openai-chat" as const, baseUrl: "https://unbound.example", requestPath: "/v1/chat/completions", authScheme: "bearer" as const, supportsStreaming: true, credentialRefs: ["bound-key"] }],
      accounts: [{ ref: "account", name: "账号", billingMode: "unknown" as const, credentials: [{ ref: "bound-key", name: "Bound Key", secret: "bound-secret" }, { ref: "unbound-key", name: "Unbound Key", secret: "unbound-secret" }] }],
    }],
  ])("rejects %s without leaving a partial aggregate", async (_label, input) => {
    const { repository, service } = createConnectionServiceTestContext(cipher, { now: () => now }, unusedProber);

    await expect(service.create({ name: "无效批量连接", providerSlug: "invalid-batch-provider", ...input })).rejects.toMatchObject({ code: "COMMON_VALIDATION_FAILED" });
    await expect(repository.list()).resolves.toHaveLength(0);
  });

  it("rejects duplicate Secret fingerprints in one request before writing", async () => {
    const { repository, service } = createConnectionServiceTestContext(cipher, { now: () => now }, unusedProber);

    await expect(service.create({
      name: "重复 Secret 连接",
      providerSlug: "duplicate-secret-provider",
      endpoints: [{ ref: "endpoint", name: "Chat", protocol: "openai-chat", baseUrl: "https://duplicate-secret.example", requestPath: "/v1/chat/completions", authScheme: "bearer", supportsStreaming: true, credentialRefs: ["key-a", "key-b"] }],
      accounts: [{ ref: "account", name: "账号", billingMode: "unknown", credentials: [{ ref: "key-a", name: "Key A", secret: "same-secret" }, { ref: "key-b", name: "Key B", secret: "same-secret" }] }],
    })).rejects.toMatchObject({ code: "CREDENTIAL_CONFLICT" });
    await expect(repository.list()).resolves.toHaveLength(0);
  });
});
