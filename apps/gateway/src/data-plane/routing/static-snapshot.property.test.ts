import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { StaticRoutingSnapshotStore } from "./static-snapshot.js";

const store = new StaticRoutingSnapshotStore({
  version: 7,
  target: {
    connectionId: "connection-1",
    credentialId: "credential-1",
    protocol: "openai-chat",
    origin: "https://provider.example",
    path: "/v1/chat/completions",
  },
});

describe("bootstrap routing snapshot properties", () => {
  it("same input and snapshot always resolve to the same decision", () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 100 }),
      (requestedModel) => {
        const input = { protocol: "openai-chat" as const, requestedModel };
        expect(store.resolve(input)).toEqual(store.resolve(input));
      },
    ));
  });

  it("never crosses the ingress protocol", () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 100 }),
      (requestedModel) => {
        expect(store.resolve({ protocol: "anthropic-messages", requestedModel })).toBeNull();
      },
    ));
  });
});
