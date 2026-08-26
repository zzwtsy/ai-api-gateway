import type { ConnectionService } from "./service.js";

import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

import { createConnectionServiceTestContext } from "../../../../tests/support/connection-service-test-context.js";
import { SecretCipher } from "../../../core/crypto/secret-cipher.js";

const now = new Date("2026-08-23T00:00:00.000Z");
const cipher = new SecretCipher({ activeKeyId: "test-v1", keys: { "test-v1": Buffer.alloc(32, 4).toString("base64") }, fingerprintPepper: "provider-fingerprint-pepper-for-test" });
const unusedProber = { probe: async () => ({ classification: "healthy" as const, statusCode: 200 }) };

describe("ConnectionService", () => {
  it("creates an aggregate that exposes only masked Credential metadata", async () => {
    const { service } = createConnectionServiceTestContext(cipher, { now: () => now }, unusedProber);
    const created = await service.create({
      name: "测试连接",
      providerSlug: "test-provider",
      endpoints: [{ ref: "endpoint-chat", name: "Chat", protocol: "openai-chat", baseUrl: "https://provider.example/", requestPath: "/v1/chat/completions", authScheme: "bearer", supportsStreaming: true, credentialRefs: ["credential-main"] }],
      accounts: [{ ref: "account-main", name: "主账号", billingMode: "metered", credentials: [{ ref: "credential-main", name: "主 Key", secret: "provider-test-value" }] }],
    });
    expect(created.accounts[0]?.credentials[0]?.maskedDisplay).toBe("••••alue");
    expect(JSON.stringify(created)).not.toContain("provider-test-value");
  });

  it("decrypts a bound Credential only for an explicit Probe and persists the safe result", async () => {
    let probeSecret: string | null = null;
    const { repository, service } = createConnectionServiceTestContext(cipher, { now: () => now }, {
      probe: async (input) => {
        probeSecret = input.secret;
        return { classification: "healthy", statusCode: 200 };
      },
    });
    const connection = await service.create({
      name: "测试连接",
      providerSlug: "test-provider",
      endpoints: [{ ref: "endpoint-chat", name: "Chat", protocol: "openai-chat", baseUrl: "https://provider.example/", requestPath: "/v1/chat/completions", authScheme: "bearer", supportsStreaming: true, credentialRefs: ["credential-main"] }],
      accounts: [{ ref: "account-main", name: "主账号", billingMode: "metered", credentials: [{ ref: "credential-main", name: "主 Key", secret: "provider-test-value" }] }],
    });
    const credential = connection.accounts[0]!.credentials[0]!;
    const endpoint = connection.endpoints[0]!;

    const result = await service.probeCredential(credential.id, endpoint.id, "test-model");

    expect(probeSecret).toBe("provider-test-value");
    expect(result).toMatchObject({ classification: "healthy", outcome: "succeeded", statusCode: 200 });
    expect(JSON.stringify(result)).not.toContain("provider-test-value");
    expect((await repository.getById(connection.id))?.accounts[0]?.credentials[0]).toMatchObject({ status: "healthy", lastSuccessAt: now });
  });

  it("adds a second protocol and binds only the selected Credential", async () => {
    const { service } = createConnectionServiceTestContext(cipher, { now: () => now }, unusedProber);
    const connection = await createConnection(service, "primary", "primary-secret");
    const credential = connection.accounts[0]!.credentials[0]!;

    const updated = await service.addEndpoints(connection.id, [{
      name: "Responses",
      protocol: "openai-responses",
      baseUrl: "https://primary.provider.example/",
      requestPath: "/v1/responses",
      authScheme: "bearer",
      supportsStreaming: true,
      credentialIds: [credential.id],
    }]);

    expect(updated.endpoints).toHaveLength(2);
    expect(updated.endpoints[1]).toMatchObject({ name: "Responses", protocol: "openai-responses", baseUrl: "https://primary.provider.example", requestPath: "/v1/responses" });
    expect(updated.accounts[0]?.credentials[0]?.endpointIds).toEqual([connection.endpoints[0]!.id, updated.endpoints[1]!.id]);
  });

  it("rejects a Credential owned by another Provider when adding an Endpoint", async () => {
    const { service } = createConnectionServiceTestContext(cipher, { now: () => now }, unusedProber);
    const connection = await createConnection(service, "primary", "primary-secret");
    const otherConnection = await createConnection(service, "other", "other-secret");

    await expect(service.addEndpoints(connection.id, [{
      name: "Responses",
      protocol: "openai-responses",
      baseUrl: "https://provider.example",
      requestPath: "/v1/responses",
      authScheme: "bearer",
      supportsStreaming: true,
      credentialIds: [otherConnection.accounts[0]!.credentials[0]!.id],
    }])).rejects.toMatchObject({ code: "ENDPOINT_TARGET_NOT_FOUND" });
  });

  it("rejects a disabled Credential when adding an Endpoint", async () => {
    const { service } = createConnectionServiceTestContext(cipher, { now: () => now }, unusedProber);
    const connection = await createConnection(service, "primary", "primary-secret");
    const credentialId = connection.accounts[0]!.credentials[0]!.id;
    await service.disableCredential(credentialId);

    await expect(service.addEndpoints(connection.id, [{
      name: "Responses",
      protocol: "openai-responses",
      baseUrl: "https://provider.example",
      requestPath: "/v1/responses",
      authScheme: "bearer",
      supportsStreaming: true,
      credentialIds: [credentialId],
    }])).rejects.toMatchObject({ code: "ENDPOINT_TARGET_NOT_FOUND" });
  });

  it("rejects a duplicate Endpoint protocol address", async () => {
    const { service } = createConnectionServiceTestContext(cipher, { now: () => now }, unusedProber);
    const connection = await createConnection(service, "primary", "primary-secret");
    const credentialId = connection.accounts[0]!.credentials[0]!.id;

    await expect(service.addEndpoints(connection.id, [{
      name: "重复 Chat",
      protocol: "openai-chat",
      baseUrl: "https://primary.provider.example/",
      requestPath: "/v1/chat/completions",
      authScheme: "bearer",
      supportsStreaming: true,
      credentialIds: [credentialId],
    }])).rejects.toMatchObject({ code: "CONNECTION_CONFLICT" });
  });
});

function createConnection(service: ConnectionService, suffix: string, secret: string) {
  return service.create({
    name: `测试连接-${suffix}`,
    providerSlug: `test-provider-${suffix}`,
    endpoints: [{ ref: "endpoint-chat", name: "Chat", protocol: "openai-chat", baseUrl: `https://${suffix}.provider.example/`, requestPath: "/v1/chat/completions", authScheme: "bearer", supportsStreaming: true, credentialRefs: ["credential-main"] }],
    accounts: [{ ref: "account-main", name: "主账号", billingMode: "metered", credentials: [{ ref: "credential-main", name: "主 Key", secret }] }],
  });
}
