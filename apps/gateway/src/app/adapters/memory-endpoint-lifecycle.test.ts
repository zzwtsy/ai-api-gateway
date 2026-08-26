import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

import { ConnectionService } from "../../control-plane/features/connections/service.js";
import { SecretCipher } from "../../core/crypto/secret-cipher.js";
import { MemoryCompatibilityProbeRepository } from "./memory-compatibility-probe-repository.js";
import { MemoryConnectionLifecycle } from "./memory-connection-lifecycle.js";
import { MemoryConnectionRepository } from "./memory-connection-repository.js";
import { MemoryEndpointLifecycle } from "./memory-endpoint-lifecycle.js";
import { MemoryModelBindingRepository } from "./memory-model-binding-repository.js";

const now = new Date("2026-08-26T00:00:00.000Z");
const later = new Date("2026-08-26T00:01:00.000Z");
const cipher = new SecretCipher({
  activeKeyId: "test-v1",
  keys: { "test-v1": Buffer.alloc(32, 4).toString("base64") },
  fingerprintPepper: "endpoint-lifecycle-test-pepper",
});
const prober = { probe: async () => ({ classification: "healthy" as const, statusCode: 200 }) };

describe("MemoryEndpointLifecycle", () => {
  it("adds a batch and preserves compatibility evidence for a name-only update", async () => {
    const fixture = await createFixture();
    const endpoint = fixture.connection.endpoints[0]!;
    const credential = fixture.connection.accounts[0]!.credentials[0]!;
    await fixture.service.addEndpoints(fixture.connection.id, [
      { name: "Responses", protocol: "openai-responses", baseUrl: "https://endpoint.example", requestPath: "/v1/responses", authScheme: "bearer", supportsStreaming: true, credentialIds: [credential.id] },
      { name: "Anthropic", protocol: "anthropic-messages", baseUrl: "https://endpoint.example", requestPath: "/v1/messages", authScheme: "x-api-key", supportsStreaming: true, credentialIds: [credential.id] },
    ]);
    await completeProbe(fixture.compatibility, fixture.connection.id, endpoint.id, credential.id);
    await fixture.models.create({ id: "model-binding-1", endpointId: endpoint.id, upstreamModelId: "model-a", name: "Model A", status: "available", createdAt: now, updatedAt: now });

    const updated = await fixture.service.updateEndpoint(endpoint.id, {
      name: "Chat renamed",
      protocol: endpoint.protocol,
      baseUrl: endpoint.baseUrl,
      requestPath: endpoint.requestPath,
      authScheme: endpoint.authScheme,
      supportsStreaming: endpoint.supportsStreaming,
      credentialIds: [credential.id],
    });
    const compatibility = await fixture.compatibility.listByConnection(fixture.connection.id);

    expect(updated.endpoints).toHaveLength(3);
    expect(updated.endpoints[0]).toMatchObject({ name: "Chat renamed" });
    expect(compatibility.facts).toHaveLength(1);
    expect(compatibility.profiles[0]).toMatchObject({ status: "verified" });
    expect((await fixture.models.list())[0]).toMatchObject({ status: "available" });
  });

  it("invalidates dependent evidence on material change and blocks active runs", async () => {
    const fixture = await createFixture();
    const endpoint = fixture.connection.endpoints[0]!;
    const credential = fixture.connection.accounts[0]!.credentials[0]!;
    await completeProbe(fixture.compatibility, fixture.connection.id, endpoint.id, credential.id);
    await fixture.models.create({ id: "model-binding-2", endpointId: endpoint.id, upstreamModelId: "model-a", name: "Model A", status: "available", createdAt: now, updatedAt: now });

    await expect(fixture.service.updateEndpoint(endpoint.id, {
      name: endpoint.name,
      protocol: endpoint.protocol,
      baseUrl: "https://changed.example",
      requestPath: endpoint.requestPath,
      authScheme: endpoint.authScheme,
      supportsStreaming: endpoint.supportsStreaming,
      credentialIds: [credential.id],
    })).resolves.toMatchObject({ endpoints: [{ baseUrl: "https://changed.example" }] });
    expect(await fixture.compatibility.listByConnection(fixture.connection.id)).toMatchObject({
      profiles: [{ status: "unverified", lastProbeAt: null, summary: null }],
      facts: [],
    });
    expect((await fixture.models.list())[0]).toMatchObject({ status: "unverified", updatedAt: now });

    const active = await fixture.compatibility.createRun({
      runId: "active-run",
      profileId: `compatibility-profile:${endpoint.id}:profile-generic-openai-chat`,
      connectionId: fixture.connection.id,
      endpointId: endpoint.id,
      credentialId: credential.id,
      harnessProfileId: "profile-generic-openai-chat",
      model: "model-a",
      checks: ["basic"],
      now: later,
    });
    expect(active.created).toBe(true);
    expect(active.run.status).toBe("queued");
    const beforeBlockedUpdate = await snapshotState(fixture, fixture.connection.id);
    await expect(fixture.service.updateEndpoint(endpoint.id, {
      ...endpoint,
      baseUrl: "https://blocked.example",
      credentialIds: [credential.id],
    })).rejects.toMatchObject({ code: "ENDPOINT_ACTIVE_PROBE" });
    const afterBlockedUpdate = await snapshotState(fixture, fixture.connection.id);
    expect(afterBlockedUpdate.connection).toEqual(beforeBlockedUpdate.connection);
    expect(afterBlockedUpdate.compatibility).toEqual(beforeBlockedUpdate.compatibility);
    expect(afterBlockedUpdate.models).toEqual(beforeBlockedUpdate.models);
  });

  it("blocks deletion for a running probe without changing any dependent state", async () => {
    const fixture = await createFixture();
    const endpoint = fixture.connection.endpoints[0]!;
    const credential = fixture.connection.accounts[0]!.credentials[0]!;
    await completeProbe(fixture.compatibility, fixture.connection.id, endpoint.id, credential.id);
    await fixture.models.create({ id: "model-binding-active-delete", endpointId: endpoint.id, upstreamModelId: "model-a", name: "Model A", status: "available", createdAt: now, updatedAt: now });

    const active = await fixture.compatibility.createRun({
      runId: "running-delete-run",
      profileId: `compatibility-profile:${endpoint.id}:profile-generic-openai-chat`,
      connectionId: fixture.connection.id,
      endpointId: endpoint.id,
      credentialId: credential.id,
      harnessProfileId: "profile-generic-openai-chat",
      model: "model-a",
      checks: ["basic"],
      now: later,
    });
    expect(active.created).toBe(true);
    const running = await fixture.compatibility.claimRun(active.run.id, later);
    expect(running?.status).toBe("running");

    expect(await fixture.service.getEndpointDeletionImpact(endpoint.id)).toEqual({
      credentialBindingCount: 1,
      modelBindingCount: 1,
      compatibilityProfileCount: 1,
      compatibilityFactCount: 1,
      completedProbeRunCount: 1,
      activeProbeRunCount: 1,
      blocked: true,
    });
    const beforeBlockedDelete = await snapshotState(fixture, fixture.connection.id);
    await expect(fixture.service.deleteEndpoint(endpoint.id)).rejects.toMatchObject({ code: "ENDPOINT_ACTIVE_PROBE" });
    const afterBlockedDelete = await snapshotState(fixture, fixture.connection.id);
    expect(afterBlockedDelete.connection).toEqual(beforeBlockedDelete.connection);
    expect(afterBlockedDelete.compatibility).toEqual(beforeBlockedDelete.compatibility);
    expect(afterBlockedDelete.models).toEqual(beforeBlockedDelete.models);
  });

  it("reports deletion impact and cascades configuration while retaining no endpoint evidence", async () => {
    const fixture = await createFixture();
    const endpoint = fixture.connection.endpoints[0]!;
    const credential = fixture.connection.accounts[0]!.credentials[0]!;
    await completeProbe(fixture.compatibility, fixture.connection.id, endpoint.id, credential.id);
    await fixture.models.create({ id: "model-binding-3", endpointId: endpoint.id, upstreamModelId: "model-a", name: "Model A", status: "available", createdAt: now, updatedAt: now });

    await expect(fixture.service.getEndpointDeletionImpact(endpoint.id)).resolves.toEqual({
      credentialBindingCount: 1,
      modelBindingCount: 1,
      compatibilityProfileCount: 1,
      compatibilityFactCount: 1,
      completedProbeRunCount: 1,
      activeProbeRunCount: 0,
      blocked: false,
    });
    const deleted = await fixture.service.deleteEndpoint(endpoint.id);

    expect(deleted.endpoints).toEqual([]);
    expect(await fixture.models.list()).toEqual([]);
    expect(await fixture.compatibility.listByConnection(fixture.connection.id)).toEqual({ profiles: [], facts: [], runs: [] });
  });
});

async function createFixture() {
  const connections = new MemoryConnectionRepository();
  const compatibility = new MemoryCompatibilityProbeRepository();
  const models = new MemoryModelBindingRepository(async endpointId =>
    (await connections.list()).some(connection => connection.endpoints.some(endpoint => endpoint.id === endpointId)));
  const lifecycle = new MemoryEndpointLifecycle(connections, models, compatibility);
  const connectionLifecycle = new MemoryConnectionLifecycle(connections, models, compatibility);
  const service = new ConnectionService(connections, cipher, { now: () => now }, prober, lifecycle, connectionLifecycle);
  const connection = await service.create({
    name: `Lifecycle ${Math.random()}`,
    providerSlug: `lifecycle-${Math.random()}`,
    endpoints: [{ ref: "endpoint-chat", name: "Chat", protocol: "openai-chat", baseUrl: "https://endpoint.example", requestPath: "/v1/chat/completions", authScheme: "bearer", supportsStreaming: true, credentialRefs: ["credential-main"] }],
    accounts: [{ ref: "account-main", name: "Primary", billingMode: "metered", credentials: [{ ref: "credential-main", name: "Primary Key", secret: `secret-${Math.random()}` }] }],
  });
  return { service, connection, connections, compatibility, models };
}

async function snapshotState(
  fixture: Awaited<ReturnType<typeof createFixture>>,
  connectionId: string,
) {
  const [connection, compatibility, models] = await Promise.all([
    fixture.connections.getById(connectionId),
    fixture.compatibility.listByConnection(connectionId),
    fixture.models.list(),
  ]);
  return {
    connection: structuredClone(connection),
    compatibility: structuredClone(compatibility),
    models: structuredClone(models),
  };
}

async function completeProbe(
  repository: MemoryCompatibilityProbeRepository,
  connectionId: string,
  endpointId: string,
  credentialId: string,
): Promise<void> {
  const created = await repository.createRun({
    runId: `run-${Math.random()}`,
    profileId: `compatibility-profile:${endpointId}:profile-generic-openai-chat`,
    connectionId,
    endpointId,
    credentialId,
    harnessProfileId: "profile-generic-openai-chat",
    model: "model-a",
    checks: ["basic"],
    now,
  });
  await repository.claimRun(created.run.id, now);
  await repository.recordCheck({ runId: created.run.id, facts: [{ featureKey: "request.basic", supportLevel: "supported", notes: "ok" }], completedChecks: 1, nextCheck: null, now });
  await repository.completeRun({ runId: created.run.id, profileStatus: "verified", summary: "ok", now });
}
