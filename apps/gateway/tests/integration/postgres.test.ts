import type { DatabaseHandle } from "../../src/db/client.js";
import { Buffer } from "node:buffer";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensurePostgresBootstrapConfiguration } from "../../src/app/adapters/postgres-bootstrap-configuration.js";
import { PostgresCompatibilityProbeRepository } from "../../src/app/adapters/postgres-compatibility-probe-repository.js";
import { PostgresConnectionRepository } from "../../src/app/adapters/postgres-connection-repository.js";
import { PostgresGatewayClientAuthenticator } from "../../src/app/adapters/postgres-gateway-client-authenticator.js";
import { PostgresProviderCredentialResolver } from "../../src/app/adapters/postgres-provider-credential-resolver.js";
import { PostgresRequestStore } from "../../src/app/adapters/postgres-request-store.js";
import { SecretCipher } from "../../src/core/crypto/secret-cipher.js";
import { createLogger } from "../../src/core/logging/logger.js";
import { systemClock } from "../../src/core/time/clock.js";
import { createDatabase } from "../../src/db/client.js";
import { runMigrations } from "../../src/db/run-migrations.js";
import { harnessProfiles } from "../../src/db/schema/index.js";

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

describe("PostgreSQL adapters", () => {
  it("initializes durable Bootstrap credentials and remains idempotent", async () => {
    const database = requireDatabase();
    const secretCipher = new SecretCipher({
      activeKeyId: "integration-v1",
      keys: { "integration-v1": Buffer.alloc(32, 13).toString("base64") },
      fingerprintPepper: "integration-provider-fingerprint-pepper",
    });
    const config = {
      BOOTSTRAP_CONNECTION_ID: "bootstrap-integration-connection",
      BOOTSTRAP_PROVIDER_CREDENTIAL_ID: "bootstrap-integration-credential",
      BOOTSTRAP_PROVIDER_API_KEY: "bootstrap-integration-provider-secret",
      GATEWAY_CLIENT_KEY: "bootstrap-integration-gateway-key",
      GATEWAY_KEY_PEPPER: "bootstrap-integration-gateway-pepper",
    };

    await ensurePostgresBootstrapConfiguration(database.db, secretCipher, config);
    await ensurePostgresBootstrapConfiguration(database.db, secretCipher, {
      ...config,
      BOOTSTRAP_PROVIDER_API_KEY: "replacement-environment-provider-secret",
      GATEWAY_CLIENT_KEY: "replacement-environment-gateway-key",
    });

    const authenticator = new PostgresGatewayClientAuthenticator(database.db, config.GATEWAY_KEY_PEPPER);
    await expect(authenticator.authenticate(config.GATEWAY_CLIENT_KEY)).resolves.toMatchObject({
      id: "bootstrap-integration-connection-client",
    });
    await expect(authenticator.authenticate("replacement-environment-gateway-key")).resolves.toBeNull();
    const resolver = new PostgresProviderCredentialResolver(database.db, secretCipher);
    await expect(resolver.resolve(config.BOOTSTRAP_PROVIDER_CREDENTIAL_ID)).resolves.toEqual({
      id: config.BOOTSTRAP_PROVIDER_CREDENTIAL_ID,
      secret: config.BOOTSTRAP_PROVIDER_API_KEY,
    });
  });

  it("persists the control-plane Connection Golden Path", async () => {
    const database = requireDatabase();
    const repository = new PostgresConnectionRepository(database.db);
    const now = systemClock.now();
    const created = await repository.create({
      providerId: "provider-integration",
      endpointId: "endpoint-integration",
      accountId: "account-integration",
      name: "Integration provider",
      providerSlug: "openai-compatible",
      endpoint: {
        name: "Chat",
        protocol: "openai-chat",
        baseUrl: "https://provider.example/v1/",
        requestPath: "/chat/completions",
        authScheme: "bearer",
        supportsStreaming: true,
      },
      account: { name: "Primary", billingMode: "metered" },
      credential: {
        id: "credential-integration",
        name: "Primary Key",
        encrypted: {
          encryptedSecret: "v1.test.test.test",
          secretKeyId: "test-v1",
          fingerprint: "fingerprint-integration",
          maskedDisplay: "••••test",
        },
      },
      now,
    });

    await expect(repository.getById(created.id)).resolves.toMatchObject({
      name: "Integration provider",
      endpoints: [{ baseUrl: "https://provider.example/v1" }],
    });
  });

  it("persists compatibility progress and model-scoped facts transactionally", async () => {
    const database = requireDatabase();
    await database.db.insert(harnessProfiles).values({
      id: "profile-integration-compatibility",
      slug: "integration-compatibility",
      name: "Integration Compatibility",
      allowedProtocols: ["openai-chat"],
    }).onConflictDoNothing();
    const connections = new PostgresConnectionRepository(database.db);
    const now = new Date("2026-08-24T12:00:00.000Z");
    await connections.create({
      providerId: "provider-compatibility-integration",
      endpointId: "endpoint-compatibility-integration",
      accountId: "account-compatibility-integration",
      name: "Compatibility integration provider",
      providerSlug: "compatibility-integration",
      endpoint: {
        name: "Chat",
        protocol: "openai-chat",
        baseUrl: "https://compatibility.example",
        requestPath: "/v1/chat/completions",
        authScheme: "bearer",
        supportsStreaming: true,
      },
      account: { name: "Primary", billingMode: "metered" },
      credential: {
        id: "credential-compatibility-integration",
        name: "Primary Key",
        encrypted: {
          encryptedSecret: "v1.integration.value",
          secretKeyId: "integration-v1",
          fingerprint: "fingerprint-compatibility-integration",
          maskedDisplay: "••••test",
        },
      },
      now,
    });
    const repository = new PostgresCompatibilityProbeRepository(database.db);
    const command = {
      runId: "probe-run-integration",
      profileId: "compatibility-profile-integration",
      connectionId: "provider-compatibility-integration",
      endpointId: "endpoint-compatibility-integration",
      credentialId: "credential-compatibility-integration",
      harnessProfileId: "profile-integration-compatibility",
      model: "model-a",
      checks: ["basic"] as const,
      now,
    };
    const created = await repository.createRun(command);
    const duplicate = await repository.createRun({ ...command, runId: "probe-run-duplicate" });
    expect(duplicate).toEqual({ run: created.run, created: false });
    const claims = await Promise.all([
      repository.claimRun(created.run.id, now),
      repository.claimRun(created.run.id, now),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    await repository.recordCheck({
      runId: created.run.id,
      facts: [{ featureKey: "auth.valid", supportLevel: "supported", notes: "鉴权通过。" }],
      completedChecks: 1,
      nextCheck: null,
      now,
    });
    await repository.completeRun({ runId: created.run.id, profileStatus: "verified", summary: "测试完成。", now });

    await expect(repository.listByConnection(command.connectionId)).resolves.toMatchObject({
      profiles: [{ status: "verified", summary: "测试完成。" }],
      facts: [{ featureKey: "auth.valid", verifiedModelId: "model-a" }],
      runs: [{ status: "succeeded", completedChecks: 1 }],
    });
  });

  it("persists Request and Attempt as one logical transaction", async () => {
    const database = requireDatabase();
    const store = new PostgresRequestStore(database.db);
    const startedAt = new Date("2026-08-22T00:00:00.000Z");
    const finishedAt = new Date("2026-08-22T00:00:00.125Z");

    await store.startRequestWithAttempt({
      request: {
        id: "req-integration",
        clientId: "client-integration",
        protocol: "openai-chat",
        requestedModel: "model-a",
        upstreamModel: "model-a",
        routingSnapshotVersion: 1,
        stream: true,
        startedAt,
      },
      attempt: {
        id: "attempt-integration",
        requestId: "req-integration",
        sequence: 1,
        connectionId: "connection-integration",
        credentialId: "credential-integration",
        upstreamModel: "model-a",
        startedAt,
      },
    });

    await store.completeRequestWithAttempt({
      request: {
        id: "req-integration",
        outcome: "succeeded",
        statusCode: 200,
        finishedAt,
        latencyMs: 125,
        ttftMs: 20,
        observationStatus: "complete",
        observedBytes: 64,
      },
      attempt: {
        id: "attempt-integration",
        outcome: "succeeded",
        statusCode: 200,
        finishedAt,
      },
    });

    await expect(store.getRequest("req-integration")).resolves.toMatchObject({
      outcome: "succeeded",
      attempts: [{ outcome: "succeeded", sequence: 1 }],
    });
  });
});

function requireDatabase(): DatabaseHandle {
  if (database === undefined)
    throw new Error("PostgreSQL integration database is not initialized");
  return database;
}
