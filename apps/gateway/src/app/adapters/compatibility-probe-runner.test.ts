import type { CompatibilityProber } from "../../control-plane/features/connections/contracts.js";

import { Buffer } from "node:buffer";

import { describe, expect, it, vi } from "vitest";
import { SecretCipher } from "../../core/crypto/secret-cipher.js";
import { createLogger } from "../../core/logging/logger.js";
import { CompatibilityProbeRunner } from "./compatibility-probe-runner.js";
import { MemoryCompatibilityProbeRepository } from "./memory-compatibility-probe-repository.js";
import { MemoryConnectionRepository } from "./memory-connection-repository.js";

describe("CompatibilityProbeRunner", () => {
  it("owns the sequential run and publishes facts only after each check", async () => {
    const fixture = await createFixture({
      probeCheck: async ({ check }) => ({
        check,
        facts: check === "basic"
          ? [
              { featureKey: "auth.valid", supportLevel: "supported", notes: "鉴权通过。" },
              { featureKey: "request.basic", supportLevel: "supported", notes: "基础请求通过。" },
            ]
          : [{ featureKey: `feature.${check}`, supportLevel: "supported", notes: "测试通过。" }],
        ...(check === "basic" ? { credentialResult: { classification: "healthy" as const, statusCode: 200 } } : {}),
      }),
    });

    fixture.runner.enqueue(fixture.runId);
    await vi.waitFor(async () => {
      const state = await fixture.compatibilityRepository.listByConnection("connection-1");
      expect(state.runs[0]?.status).toBe("succeeded");
    });

    const state = await fixture.compatibilityRepository.listByConnection("connection-1");
    expect(state.facts).toHaveLength(3);
    expect(state.profiles[0]).toMatchObject({ status: "verified", summary: "已记录 3 项实测事实，其中 3 项通过。" });
    await expect(fixture.connectionRepository.getById("connection-1")).resolves.toMatchObject({
      accounts: [{ credentials: [{ status: "healthy" }] }],
    });
    await fixture.runner.close();
  });

  it("aborts owned transport work and settles the run before close returns", async () => {
    const fixture = await createFixture({
      probeCheck: ({ signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      }),
    });
    fixture.runner.enqueue(fixture.runId);
    await vi.waitFor(async () => {
      const state = await fixture.compatibilityRepository.listByConnection("connection-1");
      expect(state.runs[0]?.status).toBe("running");
    });

    await fixture.runner.close();

    await expect(fixture.compatibilityRepository.listByConnection("connection-1")).resolves.toMatchObject({
      runs: [{ status: "failed", errorMessage: "Gateway 关闭，兼容性测试已中断。" }],
    });
  });
});

async function createFixture(prober: CompatibilityProber) {
  const cipher = new SecretCipher({
    activeKeyId: "unit-v1",
    keys: { "unit-v1": Buffer.alloc(32, 7).toString("base64") },
    fingerprintPepper: "unit-fingerprint-pepper",
  });
  const connectionRepository = new MemoryConnectionRepository();
  const encrypted = cipher.encrypt("unit-provider-value", "credential-1");
  await connectionRepository.create({
    providerId: "connection-1",
    endpointId: "endpoint-1",
    accountId: "account-1",
    name: "测试连接",
    providerSlug: "runner-provider",
    endpoint: {
      name: "Chat",
      protocol: "openai-chat",
      baseUrl: "https://provider.example",
      requestPath: "/v1/chat/completions",
      authScheme: "bearer",
      supportsStreaming: true,
    },
    account: { name: "主账号", billingMode: "unknown" },
    credential: { id: "credential-1", name: "主 Key", encrypted },
    now: new Date("2026-08-24T12:00:00.000Z"),
  });
  const compatibilityRepository = new MemoryCompatibilityProbeRepository();
  const runId = "run-1";
  await compatibilityRepository.createRun({
    runId,
    profileId: "profile-1",
    connectionId: "connection-1",
    endpointId: "endpoint-1",
    credentialId: "credential-1",
    harnessProfileId: "profile-generic-openai-chat",
    model: "model-a",
    checks: ["basic", "stream"],
    now: new Date("2026-08-24T12:00:00.000Z"),
  });
  return {
    runId,
    connectionRepository,
    compatibilityRepository,
    runner: new CompatibilityProbeRunner(
      connectionRepository,
      compatibilityRepository,
      prober,
      cipher,
      { now: () => new Date() },
      createLogger({ NODE_ENV: "test", LOG_LEVEL: "silent" }),
    ),
  };
}
