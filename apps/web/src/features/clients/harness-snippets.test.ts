import { describe, expect, it } from "vitest";
import { GATEWAY_CLIENT_KEY_PLACEHOLDER, generateHarnessSnippets } from "./harness-snippets";

describe("harness snippets", () => {
  it("generates only OpenAI Chat compatible configurations", () => {
    const snippets = generateHarnessSnippets({
      apiKey: "gw_test_key_1234",
      origin: "http://127.0.0.1:3001",
      protocol: "openai-chat",
    });

    const ids = snippets.map(s => s.id);
    expect(ids).toEqual(["cursor", "curl"]);

    const curl = snippets.find(s => s.id === "curl");
    expect(curl?.code).toContain("http://127.0.0.1:3001/openai/v1/chat/completions");
    expect(curl?.code).toContain("Authorization: Bearer gw_test_key_1234");
  });

  it("uses the Responses endpoint and input body for Codex", () => {
    const snippets = generateHarnessSnippets({
      apiKey: "gw_codex_key",
      origin: "http://127.0.0.1:3001",
      protocol: "openai-responses",
    });

    expect(snippets.map(snippet => snippet.id)).toEqual(["codex", "curl"]);
    expect(snippets[0]?.code).toContain("api_key = \"gw_codex_key\"");
    const curl = snippets.find(snippet => snippet.id === "curl");
    expect(curl?.code).toContain("http://127.0.0.1:3001/openai/v1/responses");
    expect(curl?.code).toContain("\"input\": \"ping\"");
    expect(curl?.code).not.toContain("chat/completions");
  });

  it("generates only Anthropic compatible configurations", () => {
    const snippets = generateHarnessSnippets({
      apiKey: "gw_anthropic_key",
      origin: "http://127.0.0.1:3001",
      protocol: "anthropic-messages",
    });

    expect(snippets.map(snippet => snippet.id)).toEqual(["claude", "curl"]);
    const curl = snippets.find(s => s.id === "curl");
    expect(curl?.code).toContain("http://127.0.0.1:3001/anthropic/v1/messages");
    expect(curl?.code).toContain("x-api-key: gw_anthropic_key");
  });

  it("uses an explicit non-secret placeholder when no complete Key is available", () => {
    const snippets = generateHarnessSnippets({
      origin: "http://127.0.0.1:3001",
      protocol: "openai-responses",
    });

    expect(snippets).not.toHaveLength(0);
    for (const snippet of snippets)
      expect(snippet.code).toContain(GATEWAY_CLIENT_KEY_PLACEHOLDER);
  });
});
