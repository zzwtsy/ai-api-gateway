import type { UpstreamRequest } from "./contracts.js";

import { describe, expect, it } from "vitest";
import { assertUpstreamRequestInvariant, TransportInvariantError } from "./invariant.js";

const valid: UpstreamRequest = {
  origin: "https://provider.example",
  path: "/v1/chat/completions",
  method: "POST",
  headers: { "authorization": "Bearer redacted", "content-type": "application/json" },
  body: new Uint8Array(),
  signal: new AbortController().signal,
};

describe("transport invariant", () => {
  it("accepts an origin-scoped cancellable request", () => {
    expect(() => assertUpstreamRequestInvariant(valid)).not.toThrow();
    expect(() => assertUpstreamRequestInvariant({ ...valid, method: "GET", path: "/v1/models" })).not.toThrow();
  });

  it.each([
    ["origin path", { ...valid, origin: "https://provider.example/base" }],
    ["protocol-relative path", { ...valid, path: "//other.example/v1" }],
    ["browser cookie", { ...valid, headers: { ...valid.headers, cookie: "session=secret" } }],
    ["client host", { ...valid, headers: { ...valid.headers, Host: "gateway.local" } }],
    ["GET request body", { ...valid, method: "GET" as const, path: "/v1/models", body: new Uint8Array([1]) }],
  ])("rejects %s", (_name, invalid) => {
    expect(() => assertUpstreamRequestInvariant(invalid)).toThrow(TransportInvariantError);
  });
});
