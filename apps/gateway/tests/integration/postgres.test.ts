import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PostgresConnectionRepository } from "../../src/app/adapters/postgres-connection-repository.js";
import { PostgresRequestStore } from "../../src/app/adapters/postgres-request-store.js";
import { createLogger } from "../../src/core/logging/logger.js";
import { systemClock } from "../../src/core/time/clock.js";
import { createDatabase, type DatabaseHandle } from "../../src/db/client.js";
import { runMigrations } from "../../src/db/run-migrations.js";

let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
let database: DatabaseHandle;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:18.6-bookworm").start();
  database = createDatabase(
    container.getConnectionUri(),
    createLogger({ NODE_ENV: "test", LOG_LEVEL: "silent" }),
  );
  await runMigrations(database.db);
}, 120_000);

afterAll(async () => {
  await database.close();
  await container.stop();
});

describe("PostgreSQL adapters", () => {
  it("persists the control-plane Connection Golden Path", async () => {
    const repository = new PostgresConnectionRepository(database.db, systemClock);
    const created = await repository.create({
      name: "Integration provider",
      provider: "openai-compatible",
      protocol: "openai-chat",
      baseUrl: "https://provider.example/v1/",
      enabled: true,
    });

    await expect(repository.getById(created.id)).resolves.toMatchObject({
      name: "Integration provider",
      baseUrl: "https://provider.example/v1",
    });
  });

  it("persists Request and Attempt as one logical transaction", async () => {
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
