import type { TransportRegistry, UpstreamRequest } from "../../data-plane/transport/contracts.js";
import { describe, expect, it } from "vitest";
import { TransportCredentialProber } from "./transport-credential-prober.js";

describe("TransportCredentialProber", () => {
  it("sends the smallest non-streaming request and does not expose the Secret in its result", async () => {
    let request: UpstreamRequest | null = null;
    const prober = new TransportCredentialProber(fakeTransport((input) => {
      request = input;
      return 200;
    }), 1_000);

    const result = await prober.probe({
      endpoint: endpoint("openai-responses", "bearer"),
      model: "provider-model",
      secret: "provider-secret-value",
    });

    expect(request).not.toBeNull();
    expect(request!.headers.authorization).toBe("Bearer provider-secret-value");
    expect(JSON.parse(new TextDecoder().decode(request!.body))).toEqual({
      model: "provider-model",
      input: "Reply with OK.",
      max_output_tokens: 1,
      stream: false,
    });
    expect(result).toEqual({ classification: "healthy", statusCode: 200 });
    expect(JSON.stringify(result)).not.toContain("provider-secret-value");
  });

  it("uses Anthropic headers and classifies authentication failures", async () => {
    let request: UpstreamRequest | null = null;
    const prober = new TransportCredentialProber(fakeTransport((input) => {
      request = input;
      return 401;
    }), 1_000);

    const result = await prober.probe({
      endpoint: endpoint("anthropic-messages", "x-api-key"),
      model: "claude-test",
      secret: "anthropic-secret",
    });

    expect(request!.headers).toMatchObject({
      "x-api-key": "anthropic-secret",
      "anthropic-version": "2023-06-01",
    });
    expect(result).toEqual({ classification: "auth_failed", statusCode: 401 });
  });

  it("maps transport failures to a safe unavailable result", async () => {
    const transport: TransportRegistry = {
      request: async () => { throw new Error("network included unsafe context"); },
      close: async () => {},
    };
    const result = await new TransportCredentialProber(transport, 1_000).probe({
      endpoint: endpoint("openai-chat", "bearer"),
      model: "test-model",
      secret: "provider-secret-value",
    });
    expect(result).toEqual({ classification: "unavailable", statusCode: null });
  });
});

function fakeTransport(status: (input: UpstreamRequest) => number): TransportRegistry {
  return {
    request: async input => ({
      statusCode: status(input),
      headers: {},
      body: (async function* () { yield new Uint8Array(); })(),
    }),
    close: async () => {},
  };
}

function endpoint(protocol: "openai-chat" | "openai-responses" | "anthropic-messages", authScheme: "bearer" | "x-api-key") {
  return {
    id: "endpoint_01",
    name: "Endpoint",
    protocol,
    baseUrl: "https://provider.example/api/",
    requestPath: "/v1/probe",
    authScheme,
    supportsStreaming: true,
    status: "active" as const,
  };
}
