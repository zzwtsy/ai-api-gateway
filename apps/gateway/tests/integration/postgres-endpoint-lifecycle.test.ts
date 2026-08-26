import type { DatabaseHandle } from "../../src/db/client.js";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PostgresCompatibilityProbeRepository } from "../../src/app/adapters/postgres-compatibility-probe-repository.js";
import { PostgresConnectionRepository } from "../../src/app/adapters/postgres-connection-repository.js";
import { PostgresEndpointLifecycle } from "../../src/app/adapters/postgres-endpoint-lifecycle.js";
import { PostgresModelBindingRepository } from "../../src/app/adapters/postgres-model-binding-repository.js";
import { PostgresRequestStore } from "../../src/app/adapters/postgres-request-store.js";
import { createLogger } from "../../src/core/logging/logger.js";
import { createDatabase } from "../../src/db/client.js";
import { runMigrations } from "../../src/db/run-migrations.js";
import {
  compatibilityFacts,
  compatibilityProbeRuns,
  compatibilityProfiles,
  endpointCredentials,
  providerModelBindings,
  upstreamEndpoints,
} from "../../src/db/schema/index.js";

const now = new Date("2026-08-26T08:00:00.000Z");
const later = new Date("2026-08-26T08:01:00.000Z");
const harnessProfileId = "profile-generic-openai-chat";

let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
let database: DatabaseHandle | undefined;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:18.6-bookworm").start();
  database = createDatabase(
    container.getConnectionUri(),
    createLogger({ NODE_ENV: "test", LOG_LEVEL: "silent" }),
  );
  await runMigrations(database.db);
}, 120_000);

afterAll(async () => {
  try {
    await database?.close();
  } finally {
    await container?.stop();
  }
});

describe("PostgresEndpointLifecycle", () => {
  it("rolls back a conflicting endpoint batch without changing the aggregate", async () => {
    const fixture = await createFixture("batch-rollback");
    const before = await fixture.connections.getById(fixture.connectionId);
    const newEndpointIds = ["endpoint-batch-rollback-responses", "endpoint-batch-rollback-conflict"] as const;

    await expect(fixture.lifecycle.addEndpoints({
      connectionId: fixture.connectionId,
      endpoints: [
        {
          ...endpointInput(newEndpointIds[0], "Responses", "openai-responses", "/v1/responses", fixture.credentialId),
          endpointId: newEndpointIds[0],
        },
        {
          ...endpointInput(newEndpointIds[1], "Chat", "anthropic-messages", "/v1/messages", fixture.credentialId),
          endpointId: newEndpointIds[1],
        },
      ],
      now: later,
    })).rejects.toMatchObject({ code: "CONNECTION_CONFLICT" });

    await expect(fixture.connections.getById(fixture.connectionId)).resolves.toEqual(before);
    const [endpoints, credentials, models] = await Promise.all([
      requireDatabase().db.select().from(upstreamEndpoints).where(inArray(upstreamEndpoints.id, newEndpointIds)),
      requireDatabase().db.select().from(endpointCredentials).where(inArray(endpointCredentials.endpointId, newEndpointIds)),
      requireDatabase().db.select().from(providerModelBindings).where(inArray(providerModelBindings.endpointId, newEndpointIds)),
    ]);
    expect({ endpoints, credentials, models }).toEqual({ endpoints: [], credentials: [], models: [] });
  });

  it("preserves compatibility and model evidence for a name-only update", async () => {
    const fixture = await createFixture("name-only");
    await completeProbe(fixture, "name-only");
    await createModel(fixture, "name-only");
    const before = await dependentState(fixture);

    const updated = await fixture.lifecycle.updateEndpoint({
      ...endpointUpdate(fixture),
      name: "Renamed Chat",
      now: later,
    });

    expect(updated?.endpoints).toEqual([expect.objectContaining({ id: fixture.endpointId, name: "Renamed Chat" })]);
    await expect(dependentState(fixture)).resolves.toEqual(before);
  });

  it("updates material configuration and invalidates dependent evidence transactionally", async () => {
    const fixture = await createFixture("material-update");
    await completeProbe(fixture, "material-update");
    await createModel(fixture, "material-update");

    const updated = await fixture.lifecycle.updateEndpoint({
      ...endpointUpdate(fixture),
      baseUrl: "https://material-update.changed.example",
      supportsStreaming: false,
      now: later,
    });
    const state = await dependentState(fixture);

    expect(updated?.endpoints).toEqual([expect.objectContaining({
      id: fixture.endpointId,
      baseUrl: "https://material-update.changed.example",
      supportsStreaming: false,
    })]);
    expect(state.compatibility).toMatchObject({
      profiles: [{ status: "unverified", lastProbeAt: null, summary: null }],
      facts: [],
      runs: [{ status: "succeeded" }],
    });
    expect(state.models).toEqual([expect.objectContaining({ status: "unverified", updatedAt: later })]);
  });

  it("blocks material updates and deletion for queued and running probe runs without state changes", async () => {
    const fixture = await createFixture("active-probe");
    await completeProbe(fixture, "active-probe-completed");
    await createModel(fixture, "active-probe");
    const active = await fixture.compatibility.createRun(probeCommand(fixture, "active-probe-current", "model-b", later));
    expect(active.run.status).toBe("queued");
    const beforeUpdate = await aggregateState(fixture);

    await expect(fixture.lifecycle.updateEndpoint({
      ...endpointUpdate(fixture),
      requestPath: "/v2/chat/completions",
      now: later,
    })).rejects.toMatchObject({ code: "ENDPOINT_ACTIVE_PROBE" });
    await expect(aggregateState(fixture)).resolves.toEqual(beforeUpdate);

    await expect(fixture.compatibility.claimRun(active.run.id, later)).resolves.toMatchObject({ status: "running" });
    await expect(fixture.lifecycle.getDeletionImpact(fixture.endpointId)).resolves.toEqual({
      credentialBindingCount: 1,
      modelBindingCount: 1,
      compatibilityProfileCount: 1,
      compatibilityFactCount: 1,
      completedProbeRunCount: 1,
      activeProbeRunCount: 1,
      blocked: true,
    });
    const beforeDelete = await aggregateState(fixture);
    await expect(fixture.lifecycle.deleteEndpoint(fixture.endpointId, later)).rejects.toMatchObject({
      code: "ENDPOINT_ACTIVE_PROBE",
    });
    await expect(aggregateState(fixture)).resolves.toEqual(beforeDelete);
  });

  it("reports exact impact, cascades endpoint configuration, and retains Request and Attempt history", async () => {
    const fixture = await createFixture("delete-history");
    await completeProbe(fixture, "delete-history");
    await createModel(fixture, "delete-history");
    const requestStore = new PostgresRequestStore(requireDatabase().db);
    await createCompletedRequest(requestStore, fixture);

    await expect(fixture.lifecycle.getDeletionImpact(fixture.endpointId)).resolves.toEqual({
      credentialBindingCount: 1,
      modelBindingCount: 1,
      compatibilityProfileCount: 1,
      compatibilityFactCount: 1,
      completedProbeRunCount: 1,
      activeProbeRunCount: 0,
      blocked: false,
    });
    await expect(fixture.lifecycle.deleteEndpoint(fixture.endpointId, later)).resolves.toMatchObject({ endpoints: [] });

    await expect(endpointConfigurationRows(fixture.endpointId)).resolves.toEqual({
      endpoints: [],
      credentials: [],
      models: [],
      profiles: [],
      facts: [],
      runs: [],
    });
    await expect(requestStore.getRequest(fixture.requestId)).resolves.toMatchObject({
      id: fixture.requestId,
      outcome: "succeeded",
      attempts: [{
        id: fixture.attemptId,
        connectionId: fixture.connectionId,
        credentialId: fixture.credentialId,
        outcome: "succeeded",
      }],
    });
  });
});

async function createFixture(suffix: string) {
  const connections = new PostgresConnectionRepository(requireDatabase().db);
  const lifecycle = new PostgresEndpointLifecycle(requireDatabase().db, connections);
  const compatibility = new PostgresCompatibilityProbeRepository(requireDatabase().db);
  const models = new PostgresModelBindingRepository(requireDatabase().db);
  const connectionId = `provider-endpoint-lifecycle-${suffix}`;
  const endpointId = `endpoint-lifecycle-${suffix}`;
  const credentialId = `credential-endpoint-lifecycle-${suffix}`;
  await connections.create({
    providerId: connectionId,
    name: `Endpoint lifecycle ${suffix}`,
    providerSlug: `endpoint-lifecycle-${suffix}`,
    endpoints: [endpointInput(endpointId, "Chat", "openai-chat", "/v1/chat/completions", credentialId)],
    accounts: [{
      id: `account-endpoint-lifecycle-${suffix}`,
      name: "Primary",
      billingMode: "metered",
      credentials: [{
        id: credentialId,
        name: "Primary Key",
        encrypted: {
          encryptedSecret: `obvious-test-ciphertext-${suffix}`,
          secretKeyId: "integration-test-key",
          fingerprint: `endpoint-lifecycle-fingerprint-${suffix}`,
          maskedDisplay: "test-only",
        },
      }],
    }],
    now,
  });
  return {
    connections,
    lifecycle,
    compatibility,
    models,
    connectionId,
    endpointId,
    credentialId,
    requestId: `request-endpoint-lifecycle-${suffix}`,
    attemptId: `attempt-endpoint-lifecycle-${suffix}`,
  };
}

function endpointInput(
  id: string,
  name: string,
  protocol: "openai-chat" | "openai-responses" | "anthropic-messages",
  requestPath: string,
  credentialId: string,
) {
  return {
    id,
    name,
    protocol,
    baseUrl: `https://${id}.example`,
    requestPath,
    authScheme: protocol === "anthropic-messages" ? "x-api-key" as const : "bearer" as const,
    supportsStreaming: true,
    credentialIds: [credentialId],
  };
}

function endpointUpdate(fixture: Awaited<ReturnType<typeof createFixture>>) {
  return {
    endpointId: fixture.endpointId,
    name: "Chat",
    protocol: "openai-chat" as const,
    baseUrl: `https://${fixture.endpointId}.example`,
    requestPath: "/v1/chat/completions",
    authScheme: "bearer" as const,
    supportsStreaming: true,
    credentialIds: [fixture.credentialId],
  };
}

function probeCommand(
  fixture: Awaited<ReturnType<typeof createFixture>>,
  suffix: string,
  model: string,
  at: Date,
) {
  return {
    runId: `run-endpoint-lifecycle-${suffix}`,
    profileId: `compatibility-profile:${fixture.endpointId}:${harnessProfileId}`,
    connectionId: fixture.connectionId,
    endpointId: fixture.endpointId,
    credentialId: fixture.credentialId,
    harnessProfileId,
    model,
    checks: ["basic"] as const,
    now: at,
  };
}

async function completeProbe(fixture: Awaited<ReturnType<typeof createFixture>>, suffix: string): Promise<void> {
  const created = await fixture.compatibility.createRun(probeCommand(fixture, suffix, "model-a", now));
  await fixture.compatibility.claimRun(created.run.id, now);
  await fixture.compatibility.recordCheck({
    runId: created.run.id,
    facts: [{ featureKey: "request.basic", supportLevel: "supported", notes: "integration evidence" }],
    completedChecks: 1,
    nextCheck: null,
    now,
  });
  await fixture.compatibility.completeRun({
    runId: created.run.id,
    profileStatus: "verified",
    summary: "Integration verified",
    now,
  });
}

async function createModel(fixture: Awaited<ReturnType<typeof createFixture>>, suffix: string): Promise<void> {
  await fixture.models.create({
    id: `model-binding-endpoint-lifecycle-${suffix}`,
    endpointId: fixture.endpointId,
    upstreamModelId: "model-a",
    name: "Model A",
    status: "available",
    createdAt: now,
    updatedAt: now,
  });
}

async function dependentState(fixture: Awaited<ReturnType<typeof createFixture>>) {
  const [compatibility, allModels] = await Promise.all([
    fixture.compatibility.listByConnection(fixture.connectionId),
    fixture.models.list(),
  ]);
  return {
    compatibility,
    models: allModels.filter(model => model.endpointId === fixture.endpointId),
  };
}

async function aggregateState(fixture: Awaited<ReturnType<typeof createFixture>>) {
  const [connection, dependent] = await Promise.all([
    fixture.connections.getById(fixture.connectionId),
    dependentState(fixture),
  ]);
  return { connection, ...dependent };
}

async function endpointConfigurationRows(endpointId: string) {
  const db = requireDatabase().db;
  const [endpoints, credentials, models, profiles, facts, runs] = await Promise.all([
    db.select().from(upstreamEndpoints).where(eq(upstreamEndpoints.id, endpointId)),
    db.select().from(endpointCredentials).where(eq(endpointCredentials.endpointId, endpointId)),
    db.select().from(providerModelBindings).where(eq(providerModelBindings.endpointId, endpointId)),
    db.select().from(compatibilityProfiles).where(eq(compatibilityProfiles.endpointId, endpointId)),
    db.select().from(compatibilityFacts).where(eq(compatibilityFacts.profileId, `compatibility-profile:${endpointId}:${harnessProfileId}`)),
    db.select().from(compatibilityProbeRuns).where(eq(compatibilityProbeRuns.endpointId, endpointId)),
  ]);
  return { endpoints, credentials, models, profiles, facts, runs };
}

async function createCompletedRequest(
  store: PostgresRequestStore,
  fixture: Awaited<ReturnType<typeof createFixture>>,
): Promise<void> {
  await store.startRequestWithAttempt({
    request: {
      id: fixture.requestId,
      clientId: "client-endpoint-lifecycle-history",
      protocol: "openai-chat",
      requestedModel: "model-a",
      upstreamModel: "model-a",
      routingSnapshotVersion: 1,
      stream: true,
      startedAt: now,
    },
    attempt: {
      id: fixture.attemptId,
      requestId: fixture.requestId,
      sequence: 1,
      connectionId: fixture.connectionId,
      credentialId: fixture.credentialId,
      upstreamModel: "model-a",
      startedAt: now,
    },
  });
  await store.completeRequestWithAttempt({
    request: {
      id: fixture.requestId,
      outcome: "succeeded",
      statusCode: 200,
      finishedAt: later,
      latencyMs: 60_000,
      ttftMs: 10,
      observationStatus: "complete",
      observedBytes: 64,
    },
    attempt: {
      id: fixture.attemptId,
      outcome: "succeeded",
      statusCode: 200,
      finishedAt: later,
    },
  });
}

function requireDatabase(): DatabaseHandle {
  if (database === undefined)
    throw new Error("PostgreSQL endpoint lifecycle database is not initialized");
  return database;
}
