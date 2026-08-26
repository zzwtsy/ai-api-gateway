import { describe, expect, it, vi } from "vitest";

import { MemoryCompatibilityProbeRepository } from "../../../app/adapters/memory-compatibility-probe-repository.js";
import { MemoryConnectionRepository } from "../../../app/adapters/memory-connection-repository.js";
import { CompatibilityProbeService } from "./compatibility-service.js";

describe("CompatibilityProbeService", () => {
  it("creates one durable full-suite run and reuses it while active", async () => {
    const connectionRepository = new MemoryConnectionRepository();
    await seedConnection(connectionRepository);
    const compatibilityRepository = new MemoryCompatibilityProbeRepository();
    const enqueue = vi.fn();
    const service = new CompatibilityProbeService(
      connectionRepository,
      compatibilityRepository,
      { enqueue },
      { now: () => new Date("2026-08-24T12:00:00.000Z") },
    );

    const first = await service.start({ endpointId: "endpoint-1", credentialId: "credential-1", model: "model-a" });
    const duplicate = await service.start({ endpointId: "endpoint-1", credentialId: "credential-1", model: "model-a" });

    expect(first.checks).toHaveLength(9);
    expect(duplicate.id).toBe(first.id);
    expect(enqueue).toHaveBeenCalledOnce();
    await expect(service.list("connection-1")).resolves.toMatchObject({ runs: [{ id: first.id }] });
  });
});

async function seedConnection(repository: MemoryConnectionRepository) {
  await repository.create({
    providerId: "connection-1",
    name: "测试连接",
    providerSlug: "test-provider",
    endpoints: [{
      id: "endpoint-1",
      name: "Chat",
      protocol: "openai-chat",
      baseUrl: "https://provider.example",
      requestPath: "/v1/chat/completions",
      authScheme: "bearer",
      supportsStreaming: true,
      credentialIds: ["credential-1"],
    }],
    accounts: [{
      id: "account-1",
      name: "主账号",
      billingMode: "unknown",
      credentials: [{
        id: "credential-1",
        name: "主 Key",
        encrypted: {
          encryptedSecret: "encrypted-value",
          secretKeyId: "key-1",
          fingerprint: "fingerprint-1",
          maskedDisplay: "••••test",
        },
      }],
    }],
    now: new Date("2026-08-24T12:00:00.000Z"),
  });
}
