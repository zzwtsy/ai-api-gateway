import type { TransportRegistry, UpstreamRequest } from "../../data-plane/transport/contracts.js";

import { describe, expect, it } from "vitest";

import { TransportModelCatalogDiscoverer } from "./transport-model-catalog-discoverer.js";

const endpoint = {
  id: "endpoint_01",
  name: "默认 Endpoint",
  protocol: "openai-chat" as const,
  baseUrl: "https://provider.example/api/",
  requestPath: "/v1/chat/completions",
  authScheme: "bearer" as const,
  supportsStreaming: true,
  status: "active" as const,
};

describe("TransportModelCatalogDiscoverer", () => {
  it("requests and parses an OpenAI-compatible model catalog without exposing the Secret", async () => {
    let request: UpstreamRequest | null = null;
    const discoverer = new TransportModelCatalogDiscoverer(fakeTransport((input) => {
      request = input;
      return response(200, JSON.stringify({ data: [{ id: "model-b" }, { id: "model-a" }, { id: "model-a" }] }));
    }), 1000);

    const result = await discoverer.discover({ endpoint, modelsPath: "/v1/models", secret: "provider-secret" });

    expect(result).toEqual({ outcome: "succeeded", modelIds: ["model-a", "model-b"] });
    expect(request).toMatchObject({
      origin: "https://provider.example",
      path: "/api/v1/models",
      method: "GET",
      headers: { accept: "application/json", authorization: "Bearer provider-secret" },
    });
    expect(JSON.stringify(result)).not.toContain("provider-secret");
  });

  it("rejects a non OpenAI-compatible response shape", async () => {
    const discoverer = new TransportModelCatalogDiscoverer(fakeTransport(() => response(200, JSON.stringify({ models: ["model-a"] }))), 1000);

    await expect(discoverer.discover({ endpoint, modelsPath: "/v1/models", secret: "provider-secret" }))
      .resolves
      .toEqual({ outcome: "failed", classification: "invalid_response", statusCode: 200 });
  });
});

function fakeTransport(handle: (input: UpstreamRequest) => ReturnType<typeof response>): TransportRegistry {
  return {
    request: async input => handle(input),
    close: async () => {},
  };
}

function response(statusCode: number, body: string) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: (async function* () { yield new TextEncoder().encode(body); })(),
  };
}
