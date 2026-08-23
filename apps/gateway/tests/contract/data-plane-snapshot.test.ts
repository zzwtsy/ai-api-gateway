import type { Clock } from "../../src/core/time/clock.js";
import type { TransportRegistry, UpstreamRequest, UpstreamResponse } from "../../src/data-plane/transport/contracts.js";

import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";

import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MemoryRequestStore } from "../../src/app/adapters/memory-request-store.js";
import { createApplication } from "../../src/app/create-application.js";
import { createInMemoryDependencies } from "../../src/app/create-dependencies.js";
import { EnvSchema } from "../../src/config/env-schema.js";
import { createLogger } from "../../src/core/logging/logger.js";

const fixtureDirectory = fileURLToPath(new URL("../../../../fixtures/protocols/openai-chat/golden-path/", import.meta.url));

interface ResponseFixture {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly chunksBase64: readonly string[];
}

class SnapshotTransport implements TransportRegistry {
  public lastRequest: UpstreamRequest | null = null;

  public constructor(private readonly fixture: ResponseFixture) {}

  public async request(input: UpstreamRequest): Promise<UpstreamResponse> {
    this.lastRequest = input;
    return {
      statusCode: this.fixture.statusCode,
      headers: this.fixture.headers,
      body: chunks(this.fixture.chunksBase64),
    };
  }

  public async close(): Promise<void> {}
}

class IncrementingClock implements Clock {
  #tick = 0;

  public now(): Date {
    const result = new Date(Date.UTC(2026, 7, 22, 0, 0, 0, this.#tick * 10));
    this.#tick += 1;
    return result;
  }
}

describe("keyless Data Plane protocol snapshot", () => {
  it("pins upstream bytes, downstream bytes, secret isolation and Request/Attempt facts", async () => {
    const requestBody = await readFile(`${fixtureDirectory}/request-body.txt`);
    const responseFixture = JSON.parse(
      await readFile(`${fixtureDirectory}/upstream-response.json`, "utf8"),
    ) as ResponseFixture;
    const expected = JSON.parse(
      await readFile(`${fixtureDirectory}/expected-snapshot.json`, "utf8"),
    ) as unknown;

    const env = EnvSchema.parse({
      NODE_ENV: "test",
      STORAGE_DRIVER: "memory",
      LOG_LEVEL: "silent",
      ROUTING_SNAPSHOT_VERSION: 7,
    });
    const base = createInMemoryDependencies(env, createLogger(env));
    const requestStore = new MemoryRequestStore();
    const transport = new SnapshotTransport(responseFixture);
    const app = createApplication({
      ...base,
      clock: new IncrementingClock(),
      requestStore,
      transportRegistry: transport,
    });

    const response = await app.request("/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${env.GATEWAY_CLIENT_KEY}`,
        "cookie": "control-session=must-not-forward",
        "content-type": "application/json",
        "x-api-key": "client-side-key-must-not-forward",
        "x-extra": "preserved",
      },
      body: requestBody,
    });
    const downstreamBody = new Uint8Array(await response.arrayBuffer());
    const requests = await requestStore.listRequests(10);
    const detail = await requestStore.getRequest(requests[0]?.id ?? "");
    if (transport.lastRequest === null || detail === null)
      throw new Error("Golden Path did not produce observable state");

    const actual = {
      upstream: {
        origin: transport.lastRequest.origin,
        path: transport.lastRequest.path,
        method: transport.lastRequest.method,
        headers: sortRecord({
          ...transport.lastRequest.headers,
          authorization: transport.lastRequest.headers.authorization === undefined ? "<missing>" : "[REDACTED]",
        }),
        bodyBase64: Buffer.from(transport.lastRequest.body).toString("base64"),
      },
      downstream: {
        statusCode: response.status,
        contentType: response.headers.get("content-type"),
        providerTrace: response.headers.get("x-provider-trace"),
        setCookie: response.headers.get("set-cookie"),
        bodyBase64: Buffer.from(downstreamBody).toString("base64"),
      },
      recording: {
        request: {
          clientId: detail.clientId,
          protocol: detail.protocol,
          requestedModel: detail.requestedModel,
          upstreamModel: detail.upstreamModel,
          routingSnapshotVersion: detail.routingSnapshotVersion,
          stream: detail.stream,
          outcome: detail.outcome,
          statusCode: detail.statusCode,
          latencyMs: detail.latencyMs,
          ttftMs: detail.ttftMs,
          observationStatus: detail.observationStatus,
          observedBytes: detail.observedBytes,
        },
        attempts: detail.attempts.map(attempt => ({
          sequence: attempt.sequence,
          connectionId: attempt.connectionId,
          credentialId: attempt.credentialId,
          upstreamModel: attempt.upstreamModel,
          outcome: attempt.outcome,
          statusCode: attempt.statusCode,
          errorCode: attempt.errorCode,
          fallbackReason: attempt.fallbackReason,
        })),
      },
    };

    expect(actual).toEqual(expected);
  });
});

async function* chunks(encoded: readonly string[]): AsyncIterable<Uint8Array> {
  for (const value of encoded) yield new Uint8Array(Buffer.from(value, "base64"));
}

function sortRecord(input: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(Object.entries(input).sort(([left], [right]) => left.localeCompare(right)));
}
