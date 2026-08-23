import { describe, expect, it } from "vitest";

import { readOpenAiChatRequest } from "./request.js";

describe("OpenAI Chat routing extraction", () => {
  it("extracts only model and stream while accepting unknown provider fields", () => {
    const body = new TextEncoder().encode(JSON.stringify({
      model: "provider/model",
      stream: true,
      provider_extension: { nested: [1, 2, 3] },
      tools: [{ type: "function", function: { name: "run", parameters: { type: "object" } } }],
    }));
    expect(readOpenAiChatRequest(body)).toEqual({ requestedModel: "provider/model", stream: true });
  });

  it("rejects only fields required by the gateway decision", () => {
    expect(() => readOpenAiChatRequest(new TextEncoder().encode("{}"))).toThrow("model");
  });
});
