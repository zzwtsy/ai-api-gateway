import { describe, expect, it } from "vitest";

import { createApplication } from "../../src/app/create-application.js";
import { createInMemoryDependencies } from "../../src/app/create-dependencies.js";
import { MemoryRequestStore } from "../../src/app/adapters/memory-request-store.js";
import { EnvSchema } from "../../src/config/env-schema.js";
import { createLogger } from "../../src/core/logging/logger.js";
import type { TransportRegistry, UpstreamRequest } from "../../src/data-plane/transport/contracts.js";

class FixtureTransport implements TransportRegistry {
  public lastRequest: UpstreamRequest | null = null;

  public async request(input: UpstreamRequest) {
    this.lastRequest = input;
    return {
      statusCode: 200,
      headers: { "content-type": "text/event-stream" },
      body: chunks([
        "data: {\"choices\":[{\"delta\":{\"content\":\"hello\"}}]}\n\n",
        "data: [DONE]\n\n",
      ]),
    };
  }

  public async close(): Promise<void> {}
}

async function* chunks(values: readonly string[]): AsyncIterable<Uint8Array> {
  for (const value of values) yield new TextEncoder().encode(value);
}

describe("data-plane Golden Path", () => {
  it("forwards original JSON bytes, replaces credentials, streams raw SSE and records one Request with one Attempt", async () => {
    const env = EnvSchema.parse({ NODE_ENV: "test", STORAGE_DRIVER: "memory", LOG_LEVEL: "silent" });
    const base = createInMemoryDependencies(env, createLogger(env));
    const transport = new FixtureTransport();
    const requestStore = new MemoryRequestStore();
    const app = createApplication({ ...base, requestStore, transportRegistry: transport });
    const body = JSON.stringify({ model: "demo-model", stream: true, unknown_extension: { preserved: true } });

    const response = await app.request("/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.GATEWAY_CLIENT_KEY}`,
        "content-type": "application/json",
        "x-extra": "preserved",
      },
      body,
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("data: {\"choices\":[{\"delta\":{\"content\":\"hello\"}}]}\n\ndata: [DONE]\n\n");
    expect(new TextDecoder().decode(transport.lastRequest?.body)).toBe(body);
    expect(transport.lastRequest?.headers.authorization).toBe(`Bearer ${env.BOOTSTRAP_PROVIDER_API_KEY}`);
    expect(transport.lastRequest?.headers["x-extra"]).toBe("preserved");

    const requests = await requestStore.listRequests(10);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ outcome: "succeeded", requestedModel: "demo-model" });
    const detail = await requestStore.getRequest(requests[0]?.id ?? "");
    expect(detail?.attempts).toHaveLength(1);
    expect(detail?.attempts[0]).toMatchObject({ outcome: "succeeded", credentialId: "bootstrap-provider-credential" });
  });
});
