import type { DatabaseHandle } from "../../src/db/client.js";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PostgresCompatibilityProbeRepository } from "../../src/app/adapters/postgres-compatibility-probe-repository.js";
import { PostgresConnectionLifecycle } from "../../src/app/adapters/postgres-connection-lifecycle.js";
import { PostgresConnectionRepository } from "../../src/app/adapters/postgres-connection-repository.js";
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
  providerAccounts,
  providerCredentials,
  providerModelBindings,
  providers,
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

describe("PostgresConnectionLifecycle", () => {
  it("reports impact, deletes configuration atomically, and retains Request and Attempt history", async () => {
    const fixture = await createFixture("delete-history");
    await createModel(fixture);
    await completeProbe(fixture);
    await createRequestHistory(fixture);

    await expect(fixture.lifecycle.getDeletionImpact(fixture.connectionId)).resolves.toEqual({
      endpointCount: 1,
      accountCount: 1,
      credentialCount: 1,
      credentialBindingCount: 1,
      modelBindingCount: 1,
      compatibilityProfileCount: 1,
      compatibilityFactCount: 1,
      completedProbeRunCount: 1,
      activeProbeRunCount: 0,
      blocked: false,
      blockedReason: null,
    });

    await expect(fixture.lifecycle.deleteConnection(fixture.connectionId)).resolves.toEqual({
      connectionId: fixture.connectionId,
    });
    await expect(configurationRows(fixture)).resolves.toEqual({
      providers: [],
      endpoints: [],
      accounts: [],
      credentials: [],
      endpointCredentials: [],
      models: [],
      profiles: [],
      facts: [],
      runs: [],
    });
    await expect(fixture.requests.getRequest(fixture.requestId)).resolves.toMatchObject({
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

  it("blocks queued and running Probe deletion inside the transaction", async () => {
    const fixture = await createFixture("active-probe");
    const active = await fixture.compatibility.createRun(probeCommand(fixture, "active", "model-a", now));
    const beforeQueuedDelete = await configurationRows(fixture);

    await expect(fixture.lifecycle.getDeletionImpact(fixture.connectionId)).resolves.toMatchObject({
      activeProbeRunCount: 1,
      blocked: true,
      blockedReason: "active_probe",
    });
    await expect(fixture.lifecycle.deleteConnection(fixture.connectionId)).rejects.toMatchObject({
      code: "CONNECTION_ACTIVE_PROBE",
    });
    await expect(configurationRows(fixture)).resolves.toEqual(beforeQueuedDelete);

    await expect(fixture.compatibility.claimRun(active.run.id, later)).resolves.toMatchObject({ status: "running" });
    const beforeRunningDelete = await configurationRows(fixture);
    await expect(fixture.lifecycle.deleteConnection(fixture.connectionId)).rejects.toMatchObject({
      code: "CONNECTION_ACTIVE_PROBE",
    });
    await expect(configurationRows(fixture)).resolves.toEqual(beforeRunningDelete);
  });

  it("allows deletion of the configured Bootstrap connection", async () => {
    const fixture = await createFixture("bootstrap", "provider-bootstrap-connection");

    await expect(fixture.lifecycle.getDeletionImpact(fixture.connectionId)).resolves.toMatchObject({
      blocked: false,
      blockedReason: null,
    });
    await expect(fixture.lifecycle.deleteConnection(fixture.connectionId)).resolves.toEqual({
      connectionId: fixture.connectionId,
    });
    await expect(configurationRows(fixture)).resolves.toMatchObject({
      providers: [],
      endpoints: [],
    });
  });
});

async function createFixture(suffix: string, connectionId = `provider-connection-lifecycle-${suffix}`) {
  const db = requireDatabase().db;
  const connections = new PostgresConnectionRepository(db);
  const compatibility = new PostgresCompatibilityProbeRepository(db);
  const models = new PostgresModelBindingRepository(db);
  const endpointId = `endpoint-connection-lifecycle-${suffix}`;
  const accountId = `account-connection-lifecycle-${suffix}`;
  const credentialId = `credential-connection-lifecycle-${suffix}`;
  await connections.create({
    providerId: connectionId,
    name: `Connection lifecycle ${suffix}`,
    providerSlug: `connection-lifecycle-${suffix}`,
    endpoints: [{
      id: endpointId,
      name: "Chat",
      protocol: "openai-chat",
      baseUrl: `https://${endpointId}.example`,
      requestPath: "/v1/chat/completions",
      authScheme: "bearer",
      supportsStreaming: true,
      credentialIds: [credentialId],
    }],
    accounts: [{
      id: accountId,
      name: "Primary",
      billingMode: "metered",
      credentials: [{
        id: credentialId,
        name: "Primary Key",
        encrypted: {
          encryptedSecret: `ciphertext-${suffix}`,
          secretKeyId: "integration-test-key",
          fingerprint: `fingerprint-connection-lifecycle-${suffix}`,
          maskedDisplay: "••••test",
        },
      }],
    }],
    now,
  });
  return {
    accountId,
    connections,
    connectionId,
    credentialId,
    endpointId,
    compatibility,
    lifecycle: new PostgresConnectionLifecycle(db),
    models,
    requestId: `request-connection-lifecycle-${suffix}`,
    attemptId: `attempt-connection-lifecycle-${suffix}`,
    requests: new PostgresRequestStore(db),
  };
}

function probeCommand(
  fixture: Awaited<ReturnType<typeof createFixture>>,
  suffix: string,
  model: string,
  at: Date,
) {
  return {
    runId: `run-connection-lifecycle-${suffix}-${fixture.connectionId}`,
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

async function completeProbe(fixture: Awaited<ReturnType<typeof createFixture>>): Promise<void> {
  const created = await fixture.compatibility.createRun(probeCommand(fixture, "completed", "model-a", now));
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

async function createModel(fixture: Awaited<ReturnType<typeof createFixture>>): Promise<void> {
  await fixture.models.create({
    id: `model-binding-connection-lifecycle-${fixture.connectionId}`,
    endpointId: fixture.endpointId,
    upstreamModelId: "model-a",
    name: "Model A",
    status: "available",
    createdAt: now,
    updatedAt: now,
  });
}

async function createRequestHistory(fixture: Awaited<ReturnType<typeof createFixture>>): Promise<void> {
  await fixture.requests.startRequestWithAttempt({
    request: {
      id: fixture.requestId,
      clientId: "client-connection-lifecycle",
      protocol: "openai-chat",
      requestedModel: "model-a",
      upstreamModel: "model-a",
      routingSnapshotVersion: 1,
      stream: false,
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
  await fixture.requests.completeRequestWithAttempt({
    request: {
      id: fixture.requestId,
      outcome: "succeeded",
      statusCode: 200,
      finishedAt: later,
      latencyMs: 100,
      ttftMs: null,
      observationStatus: "complete",
      observedBytes: 16,
    },
    attempt: {
      id: fixture.attemptId,
      outcome: "succeeded",
      statusCode: 200,
      finishedAt: later,
    },
  });
}

async function configurationRows(fixture: Awaited<ReturnType<typeof createFixture>>) {
  const db = requireDatabase().db;
  const [providersRows, endpoints, accounts, credentials, bindings, models, profiles, facts, runs] = await Promise.all([
    db.select().from(providers).where(eq(providers.id, fixture.connectionId)),
    db.select().from(upstreamEndpoints).where(eq(upstreamEndpoints.id, fixture.endpointId)),
    db.select().from(providerAccounts).where(eq(providerAccounts.id, fixture.accountId)),
    db.select().from(providerCredentials).where(eq(providerCredentials.id, fixture.credentialId)),
    db.select().from(endpointCredentials).where(eq(endpointCredentials.endpointId, fixture.endpointId)),
    db.select().from(providerModelBindings).where(eq(providerModelBindings.endpointId, fixture.endpointId)),
    db.select().from(compatibilityProfiles).where(eq(compatibilityProfiles.connectionId, fixture.connectionId)),
    db.select().from(compatibilityFacts).where(eq(compatibilityFacts.profileId, `compatibility-profile:${fixture.endpointId}:${harnessProfileId}`)),
    db.select().from(compatibilityProbeRuns).where(eq(compatibilityProbeRuns.connectionId, fixture.connectionId)),
  ]);
  return {
    providers: providersRows,
    endpoints,
    accounts,
    credentials,
    endpointCredentials: bindings,
    models,
    profiles,
    facts,
    runs,
  };
}

function requireDatabase(): DatabaseHandle {
  if (database === undefined)
    throw new Error("PostgreSQL connection lifecycle database is not initialized");
  return database;
}
