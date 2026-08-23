import { describe, expect, it } from "vitest";

import { StaticRoutingSnapshotStore } from "./static-snapshot.js";

const store = new StaticRoutingSnapshotStore({
  version: 7,
  target: {
    connectionId: "conn",
    credentialId: "cred",
    protocol: "openai-chat",
    origin: "http://provider.test",
    path: "/v1/chat/completions",
  },
});

describe("StaticRoutingSnapshotStore", () => {
  it("resolves deterministically and preserves the requested model", () => {
    expect(store.resolve({ protocol: "openai-chat", requestedModel: "model-a" })).toMatchObject({
      snapshotVersion: 7,
      requestedModel: "model-a",
      target: { upstreamModel: "model-a", protocol: "openai-chat" },
    });
  });

  it("rejects cross-protocol targets", () => {
    expect(store.resolve({ protocol: "anthropic-messages", requestedModel: "model-a" })).toBeNull();
  });
});
