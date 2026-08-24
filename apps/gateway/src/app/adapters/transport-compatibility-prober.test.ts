import type { UpstreamRequest, UpstreamResponse } from "../../data-plane/transport/contracts.js";

import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";
import { TransportCompatibilityProber } from "./transport-compatibility-prober.js";

describe("TransportCompatibilityProber", () => {
  it("classifies the complete OpenAI Chat probe suite without exposing response bodies", async () => {
    const transport = new ChatProbeTransport();
    const prober = new TransportCompatibilityProber(transport, 1_000);
    const results = [];
    for (const check of ["basic", "stream", "usage", "unknown_field", "tools", "reasoning", "structured_output", "error_shape", "harness"] as const) {
      results.push(await prober.probeCheck({
        check,
        endpoint: endpoint(),
        model: "model-a",
        secret: "unit-value",
        signal: new AbortController().signal,
      }));
    }

    expect(results.flatMap(result => result.facts).map(fact => [fact.featureKey, fact.supportLevel])).toEqual([
      ["auth.valid", "supported"],
      ["request.basic", "supported"],
      ["stream.sse", "supported"],
      ["usage.reported", "supported"],
      ["fields.unknown", "ignored"],
      ["tools.function_call", "supported"],
      ["reasoning.output", "supported"],
      ["output.structured", "supported"],
      ["error.envelope", "supported"],
      ["harness.openai_chat.stream_usage", "supported"],
    ]);
    expect(transport.requests).toHaveLength(9);
    expect(JSON.stringify(results)).not.toContain("unit-value");
  });

  it("marks authentication failure as terminal for the remaining suite", async () => {
    const prober = new TransportCompatibilityProber({
      request: async () => response(401, { "content-type": "application/json" }, JSON.stringify({ error: { message: "invalid" } })),
      close: async () => {},
    }, 1_000);

    const result = await prober.probeCheck({
      check: "basic",
      endpoint: endpoint(),
      model: "model-a",
      secret: "invalid-unit-value",
      signal: new AbortController().signal,
    });
    expect(result).toMatchObject({
      stopRemainingChecks: true,
      credentialResult: { classification: "auth_failed", statusCode: 401 },
    });
    expect(result.facts).toContainEqual(expect.objectContaining({ featureKey: "auth.valid", supportLevel: "unsupported" }));
  });

  it("uses protocol-native Codex and Claude Code harness requests", async () => {
    const requests: UpstreamRequest[] = [];
    const prober = new TransportCompatibilityProber({
      request: async (input) => {
        requests.push(input);
        if (input.path.endsWith("/responses")) {
          return response(200, { "content-type": "text/event-stream" }, [
            `data: ${JSON.stringify({ type: "response.output_item.added", item: { type: "function_call", name: "apply_patch" } })}`,
            `data: ${JSON.stringify({ type: "response.completed", response: { status: "completed" } })}`,
            "data: [DONE]",
            "",
          ].join("\n\n"));
        }
        return response(200, { "content-type": "application/json" }, JSON.stringify({
          id: "msg-test",
          type: "message",
          content: [{ type: "tool_use", name: "apply_patch", input: { ok: true } }],
          usage: { input_tokens: 1, output_tokens: 1 },
        }));
      },
      close: async () => {},
    }, 1_000);

    const codex = await prober.probeCheck({
      check: "harness",
      endpoint: endpoint("openai-responses", "bearer", "/v1/responses"),
      model: "responses-model",
      secret: "unit-value",
      signal: new AbortController().signal,
    });
    const claudeCode = await prober.probeCheck({
      check: "harness",
      endpoint: endpoint("anthropic-messages", "x-api-key", "/v1/messages"),
      model: "messages-model",
      secret: "unit-value",
      signal: new AbortController().signal,
    });

    expect(codex.facts).toContainEqual(expect.objectContaining({ featureKey: "harness.codex.apply_patch", supportLevel: "supported" }));
    expect(claudeCode.facts).toContainEqual(expect.objectContaining({ featureKey: "harness.claude_code.tool_use", supportLevel: "supported" }));
    expect(requests[0]).toMatchObject({ path: "/v1/responses", headers: { authorization: "Bearer unit-value" } });
    expect(requests[1]).toMatchObject({
      path: "/v1/messages",
      headers: { "x-api-key": "unit-value", "anthropic-version": "2023-06-01" },
    });
    expect(Buffer.from(requests[0]!.body).toString("utf8")).toContain("apply_patch");
    expect(Buffer.from(requests[1]!.body).toString("utf8")).toContain("apply_patch");
  });
});

class ChatProbeTransport {
  readonly requests: UpstreamRequest[] = [];

  public async request(input: UpstreamRequest): Promise<UpstreamResponse> {
    this.requests.push(input);
    const body = JSON.parse(Buffer.from(input.body).toString("utf8")) as Record<string, unknown>;
    if (body.model === undefined)
      return response(400, { "content-type": "application/json" }, JSON.stringify({ error: { message: "model required" } }));
    if (body.stream === true) {
      const usage = body.stream_options === undefined ? "" : `data: ${JSON.stringify({ choices: [], usage: { total_tokens: 2 } })}\n\n`;
      return response(200, { "content-type": "text/event-stream" }, `data: ${JSON.stringify({ choices: [{ delta: { content: "OK" } }] })}\n\n${usage}data: [DONE]\n\n`);
    }
    if (body.tools !== undefined) {
      return response(200, { "content-type": "application/json" }, JSON.stringify({
        choices: [{ message: { tool_calls: [{ function: { name: "aigw_probe", arguments: "{\"ok\":true}" } }] } }],
      }));
    }
    if (body.reasoning_effort !== undefined) {
      return response(200, { "content-type": "application/json" }, JSON.stringify({
        choices: [{ message: { content: "OK" } }],
        usage: { completion_tokens_details: { reasoning_tokens: 1 } },
      }));
    }
    if (body.response_format !== undefined) {
      return response(200, { "content-type": "application/json" }, JSON.stringify({
        choices: [{ message: { content: "{\"ok\":true}" } }],
      }));
    }
    return response(200, { "content-type": "application/json" }, JSON.stringify({
      choices: [{ message: { content: "OK" } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }));
  }

  public async close(): Promise<void> {}
}

function endpoint(
  protocol: "openai-chat" | "openai-responses" | "anthropic-messages" = "openai-chat",
  authScheme: "bearer" | "x-api-key" = "bearer",
  requestPath = "/v1/chat/completions",
) {
  return {
    id: "endpoint-1",
    name: "Chat",
    protocol,
    baseUrl: "https://provider.example",
    requestPath,
    authScheme,
    supportsStreaming: true,
    status: "active" as const,
  };
}

function response(statusCode: number, headers: Record<string, string>, text: string): UpstreamResponse {
  return {
    statusCode,
    headers,
    body: (async function* () {
      yield Buffer.from(text);
    })(),
  };
}
