import { describe, expect, it } from "vitest";

import { MemoryCompatibilityProbeRepository } from "./memory-compatibility-probe-repository.js";

describe("MemoryCompatibilityProbeRepository", () => {
  it("deduplicates an active target and persists model-scoped facts", async () => {
    const repository = new MemoryCompatibilityProbeRepository();
    const now = new Date("2026-08-24T12:00:00.000Z");
    const command = {
      runId: "run-1",
      profileId: "profile-1",
      connectionId: "connection-1",
      endpointId: "endpoint-1",
      credentialId: "credential-1",
      harnessProfileId: "profile-generic-openai-chat",
      model: "model-a",
      checks: ["basic", "stream"] as const,
      now,
    };

    const first = await repository.createRun(command);
    const duplicate = await repository.createRun({ ...command, runId: "run-2" });
    expect(first.created).toBe(true);
    expect(duplicate).toEqual({ run: first.run, created: false });

    await expect(repository.claimRun(first.run.id, now)).resolves.toMatchObject({ status: "running" });
    await repository.recordCheck({
      runId: first.run.id,
      facts: [{ featureKey: "auth.valid", supportLevel: "supported", notes: "鉴权通过。" }],
      completedChecks: 1,
      nextCheck: "stream",
      now,
    });
    await repository.completeRun({ runId: first.run.id, profileStatus: "partial", summary: "1 项通过。", now });

    await expect(repository.listByConnection("connection-1")).resolves.toMatchObject({
      profiles: [{ id: "profile-1", status: "partial", summary: "1 项通过。" }],
      facts: [{ featureKey: "auth.valid", verifiedModelId: "model-a", evidenceRef: "run-1" }],
      runs: [{ id: "run-1", status: "succeeded", completedChecks: 2 }],
    });
  });
});
