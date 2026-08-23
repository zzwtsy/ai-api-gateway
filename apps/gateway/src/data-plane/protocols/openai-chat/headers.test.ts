import { describe, expect, it } from "vitest";

import { buildUpstreamHeaders } from "./headers.js";

describe("OpenAI request headers", () => {
  it("removes hop-by-hop and client credentials before adding the provider credential", () => {
    const headers = new Headers({
      "authorization": "Bearer gateway-key",
      "connection": "keep-alive",
      "cookie": "better-auth.session_token=must-not-leak",
      "content-type": "application/json",
      "x-provider-extension": "kept",
    });
    expect(buildUpstreamHeaders(headers, "provider-secret")).toEqual({
      "authorization": "Bearer provider-secret",
      "content-type": "application/json",
      "x-provider-extension": "kept",
    });
  });
});
