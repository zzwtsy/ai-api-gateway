import { Buffer } from "node:buffer";
import { expect, it } from "vitest";

import { createConnectionServiceTestContext } from "../../../../tests/support/connection-service-test-context.js";
import { MemoryConnectionRepository } from "../../../app/adapters/memory-connection-repository.js";
import { SecretCipher } from "../../../core/crypto/secret-cipher.js";
import { ModelDiscoveryService } from "./model-discovery-service.js";

const now = new Date("2026-08-24T00:00:00.000Z");
const cipher = new SecretCipher({
  activeKeyId: "test-v1",
  keys: { "test-v1": Buffer.alloc(32, 5).toString("base64") },
  fingerprintPepper: "model-discovery-fingerprint-pepper",
});

it("decrypts only the selected bound Credential and returns safe model IDs", async () => {
  const { repository, service: connectionService } = createConnectionServiceTestContext(cipher, { now: () => now }, {
    probe: async () => ({ classification: "healthy", statusCode: 200 }),
  });
  const connection = await connectionService.create({
    name: "测试连接",
    providerSlug: "test-provider",
    endpoints: [{
      ref: "endpoint-chat",
      name: "Chat",
      protocol: "openai-chat",
      baseUrl: "https://provider.example",
      requestPath: "/v1/chat/completions",
      authScheme: "bearer",
      supportsStreaming: true,
      credentialRefs: ["credential-main"],
    }],
    accounts: [{
      ref: "account-main",
      name: "主账号",
      billingMode: "metered",
      credentials: [{ ref: "credential-main", name: "主 Key", secret: "provider-secret" }],
    }],
  });
  let observedSecret: string | null = null;
  const service = new ModelDiscoveryService(repository, cipher, {
    discover: async (input) => {
      observedSecret = input.secret;
      return { outcome: "succeeded", modelIds: ["model-a", "model-b"] };
    },
  });

  const result = await service.discover({
    endpointId: connection.endpoints[0]!.id,
    credentialId: connection.accounts[0]!.credentials[0]!.id,
    modelsPath: "/v1/models",
  });

  expect(observedSecret).toBe("provider-secret");
  expect(result).toEqual({ models: [{ id: "model-a" }, { id: "model-b" }] });
  expect(JSON.stringify(result)).not.toContain("provider-secret");
});

it("rejects an Endpoint and Credential that are not bound", async () => {
  const repository = new MemoryConnectionRepository();
  const service = new ModelDiscoveryService(repository, cipher, {
    discover: async () => ({ outcome: "succeeded", modelIds: [] }),
  });

  await expect(service.discover({
    endpointId: "missing-endpoint",
    credentialId: "missing-credential",
    modelsPath: "/v1/models",
  })).rejects.toMatchObject({ code: "MODEL_DISCOVERY_TARGET_NOT_FOUND" });
});

it("maps an invalid upstream catalog to a stable control-plane error", async () => {
  const { repository, service: connectionService } = createConnectionServiceTestContext(cipher, { now: () => now }, {
    probe: async () => ({ classification: "healthy", statusCode: 200 }),
  });
  const connection = await connectionService.create({
    name: "测试连接",
    providerSlug: "test-provider",
    endpoints: [{
      ref: "endpoint-chat",
      name: "Chat",
      protocol: "openai-chat",
      baseUrl: "https://provider.example",
      requestPath: "/v1/chat/completions",
      authScheme: "bearer",
      supportsStreaming: true,
      credentialRefs: ["credential-main"],
    }],
    accounts: [{
      ref: "account-main",
      name: "主账号",
      billingMode: "metered",
      credentials: [{ ref: "credential-main", name: "主 Key", secret: "provider-secret" }],
    }],
  });
  const service = new ModelDiscoveryService(repository, cipher, {
    discover: async () => ({ outcome: "failed", classification: "invalid_response", statusCode: 200 }),
  });

  await expect(service.discover({
    endpointId: connection.endpoints[0]!.id,
    credentialId: connection.accounts[0]!.credentials[0]!.id,
    modelsPath: "/v1/models",
  })).rejects.toMatchObject({ code: "MODEL_DISCOVERY_FAILED" });
});
