import type { ConnectionRecord } from "../../control-plane/features/connections/contracts.js";

import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

import { ConnectionService } from "../../control-plane/features/connections/service.js";
import { SecretCipher } from "../../core/crypto/secret-cipher.js";
import { MemoryCompatibilityProbeRepository } from "./memory-compatibility-probe-repository.js";
import { MemoryConnectionLifecycle } from "./memory-connection-lifecycle.js";
import { MemoryConnectionRepository } from "./memory-connection-repository.js";
import { MemoryEndpointLifecycle } from "./memory-endpoint-lifecycle.js";
import { MemoryModelBindingRepository } from "./memory-model-binding-repository.js";
import { MemoryRequestStore } from "./memory-request-store.js";

const now = new Date("2026-08-26T00:00:00.000Z");
const later = new Date("2026-08-26T00:01:00.000Z");
const cipher = new SecretCipher({
  activeKeyId: "test-v1",
  keys: { "test-v1": Buffer.alloc(32, 8).toString("base64") },
  fingerprintPepper: "connection-lifecycle-test-pepper",
});
const prober = { probe: async () => ({ classification: "healthy" as const, statusCode: 200 }) };

describe("MemoryConnectionLifecycle", () => {
  it("reports the full deletion impact, removes configuration, and retains history", async () => {
    const fixture = await createFixture();
    const [chat, responses] = fixture.connection.endpoints;
    const [mainCredential] = fixture.connection.accounts.flatMap(account => account.credentials);
    await fixture.models.create({
      id: "model-binding-chat",
      endpointId: chat!.id,
      upstreamModelId: "model-a",
      name: "Model A",
      status: "available",
      createdAt: now,
      updatedAt: now,
    });
    await fixture.models.create({
      id: "model-binding-responses",
      endpointId: responses!.id,
      upstreamModelId: "model-b",
      name: "Model B",
      status: "available",
      createdAt: now,
      updatedAt: now,
    });
    await completeProbe(fixture.compatibility, fixture.connection, chat!.id, mainCredential!.id, "model-a");
    await completeProbe(fixture.compatibility, fixture.connection, responses!.id, mainCredential!.id, "model-b");
    await createRequestHistory(fixture.requests, fixture.connection, mainCredential!.id);

    await expect(fixture.service.getConnectionDeletionImpact(fixture.connection.id)).resolves.toEqual({
      endpointCount: 2,
      accountCount: 2,
      credentialCount: 2,
      credentialBindingCount: 3,
      modelBindingCount: 2,
      compatibilityProfileCount: 2,
      compatibilityFactCount: 2,
      completedProbeRunCount: 2,
      activeProbeRunCount: 0,
      blocked: false,
      blockedReason: null,
    });

    await expect(fixture.service.deleteConnection(fixture.connection.id)).resolves.toEqual({
      connectionId: fixture.connection.id,
    });
    await expect(fixture.repository.getById(fixture.connection.id)).resolves.toBeNull();
    await expect(fixture.models.list()).resolves.toEqual([]);
    await expect(fixture.compatibility.listByConnection(fixture.connection.id)).resolves.toEqual({
      profiles: [],
      facts: [],
      runs: [],
    });
    await expect(fixture.requests.getRequest("request-connection-lifecycle")).resolves.toMatchObject({
      id: "request-connection-lifecycle",
      attempts: [{ connectionId: fixture.connection.id, credentialId: mainCredential!.id }],
    });

    const recreated = await fixture.service.create({
      name: "Recreated connection",
      providerSlug: "recreated-connection",
      endpoints: [{
        ref: "endpoint",
        name: "Chat",
        protocol: "openai-chat",
        baseUrl: "https://recreated.example",
        requestPath: "/v1/chat/completions",
        authScheme: "bearer",
        supportsStreaming: true,
        credentialRefs: ["credential"],
      }],
      accounts: [{
        ref: "account",
        name: "Primary",
        billingMode: "metered",
        credentials: [{ ref: "credential", name: "Primary Key", secret: "shared-secret" }],
      }],
    });
    expect(recreated.name).toBe("Recreated connection");
  });

  it("blocks deletion while a Probe is queued or running without changing configuration", async () => {
    const fixture = await createFixture();
    const endpoint = fixture.connection.endpoints[0]!;
    const credential = fixture.connection.accounts[0]!.credentials[0]!;
    const active = await fixture.compatibility.createRun({
      runId: "active-connection-delete-run",
      profileId: `compatibility-profile:${endpoint.id}:profile-generic-openai-chat`,
      connectionId: fixture.connection.id,
      endpointId: endpoint.id,
      credentialId: credential.id,
      harnessProfileId: "profile-generic-openai-chat",
      model: "model-active",
      checks: ["basic"],
      now,
    });
    const before = await connectionState(fixture);

    await expect(fixture.service.getConnectionDeletionImpact(fixture.connection.id)).resolves.toMatchObject({
      activeProbeRunCount: 1,
      blocked: true,
      blockedReason: "active_probe",
    });
    await expect(fixture.service.deleteConnection(fixture.connection.id)).rejects.toMatchObject({
      code: "CONNECTION_ACTIVE_PROBE",
    });
    await expect(connectionState(fixture)).resolves.toEqual(before);

    await fixture.compatibility.claimRun(active.run.id, later);
    const beforeRunningDelete = await connectionState(fixture);
    await expect(fixture.service.deleteConnection(fixture.connection.id)).rejects.toMatchObject({
      code: "CONNECTION_ACTIVE_PROBE",
    });
    await expect(connectionState(fixture)).resolves.toEqual(beforeRunningDelete);
  });

  it("allows deletion for the configured Bootstrap connection", async () => {
    const fixture = await createFixture("bootstrap-connection");

    await expect(fixture.service.getConnectionDeletionImpact(fixture.connection.id)).resolves.toMatchObject({
      blocked: false,
      blockedReason: null,
    });
    await expect(fixture.service.deleteConnection(fixture.connection.id)).resolves.toEqual({
      connectionId: fixture.connection.id,
    });
    await expect(fixture.repository.getById(fixture.connection.id)).resolves.toBeNull();
  });
});

async function createFixture(connectionId = "connection-lifecycle") {
  const repository = new MemoryConnectionRepository();
  const compatibility = new MemoryCompatibilityProbeRepository();
  const models = new MemoryModelBindingRepository(async endpointId =>
    (await repository.list()).some(connection => connection.endpoints.some(endpoint => endpoint.id === endpointId)));
  const endpointLifecycle = new MemoryEndpointLifecycle(repository, models, compatibility);
  const lifecycle = new MemoryConnectionLifecycle(repository, models, compatibility);
  const service = new ConnectionService(repository, cipher, { now: () => now }, prober, endpointLifecycle, lifecycle);
  const mainEncrypted = cipher.encrypt("shared-secret", "credential-main");
  const fallbackEncrypted = cipher.encrypt("fallback-secret", "credential-fallback");
  const connection = await repository.create({
    providerId: connectionId,
    name: "Lifecycle connection",
    providerSlug: "lifecycle-connection",
    endpoints: [
      {
        id: "endpoint-chat",
        name: "Chat",
        protocol: "openai-chat",
        baseUrl: "https://chat.example",
        requestPath: "/v1/chat/completions",
        authScheme: "bearer",
        supportsStreaming: true,
        credentialIds: ["credential-main", "credential-fallback"],
      },
      {
        id: "endpoint-responses",
        name: "Responses",
        protocol: "openai-responses",
        baseUrl: "https://responses.example",
        requestPath: "/v1/responses",
        authScheme: "bearer",
        supportsStreaming: true,
        credentialIds: ["credential-main"],
      },
    ],
    accounts: [
      {
        id: "account-main",
        name: "Primary",
        billingMode: "metered",
        credentials: [{
          id: "credential-main",
          name: "Primary Key",
          encrypted: mainEncrypted,
        }],
      },
      {
        id: "account-fallback",
        name: "Fallback",
        billingMode: "subscription",
        credentials: [{
          id: "credential-fallback",
          name: "Fallback Key",
          encrypted: fallbackEncrypted,
        }],
      },
    ],
    now,
  });
  return {
    compatibility,
    connection,
    models,
    requests: new MemoryRequestStore(),
    repository,
    service,
  };
}

async function completeProbe(
  repository: MemoryCompatibilityProbeRepository,
  connection: ConnectionRecord,
  endpointId: string,
  credentialId: string,
  model: string,
): Promise<void> {
  const created = await repository.createRun({
    runId: `completed-${endpointId}`,
    profileId: `compatibility-profile:${endpointId}:${endpointId === connection.endpoints[0]?.id ? "profile-generic-openai-chat" : "profile-codex"}`,
    connectionId: connection.id,
    endpointId,
    credentialId,
    harnessProfileId: endpointId === connection.endpoints[0]?.id ? "profile-generic-openai-chat" : "profile-codex",
    model,
    checks: ["basic"],
    now,
  });
  await repository.claimRun(created.run.id, now);
  await repository.recordCheck({
    runId: created.run.id,
    facts: [{ featureKey: "request.basic", supportLevel: "supported", notes: "ok" }],
    completedChecks: 1,
    nextCheck: null,
    now,
  });
  await repository.completeRun({ runId: created.run.id, profileStatus: "verified", summary: "ok", now });
}

async function createRequestHistory(
  requests: MemoryRequestStore,
  connection: ConnectionRecord,
  credentialId: string,
): Promise<void> {
  await requests.startRequestWithAttempt({
    request: {
      id: "request-connection-lifecycle",
      clientId: "client-connection-lifecycle",
      protocol: "openai-chat",
      requestedModel: "model-a",
      upstreamModel: "model-a",
      routingSnapshotVersion: 1,
      stream: false,
      startedAt: now,
    },
    attempt: {
      id: "attempt-connection-lifecycle",
      requestId: "request-connection-lifecycle",
      sequence: 1,
      connectionId: connection.id,
      credentialId,
      upstreamModel: "model-a",
      startedAt: now,
    },
  });
  await requests.completeRequestWithAttempt({
    request: {
      id: "request-connection-lifecycle",
      outcome: "succeeded",
      statusCode: 200,
      finishedAt: later,
      latencyMs: 100,
      ttftMs: null,
      observationStatus: "complete",
      observedBytes: 16,
    },
    attempt: {
      id: "attempt-connection-lifecycle",
      outcome: "succeeded",
      statusCode: 200,
      finishedAt: later,
    },
  });
}

async function connectionState(fixture: Awaited<ReturnType<typeof createFixture>>) {
  const [connection, models, compatibility] = await Promise.all([
    fixture.repository.getById(fixture.connection.id),
    fixture.models.list(),
    fixture.compatibility.listByConnection(fixture.connection.id),
  ]);
  return { compatibility, connection, models };
}
