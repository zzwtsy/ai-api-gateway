import type { RoutingDecision, RoutingResolutionInput } from "./contracts.js";

import { describe, expect, it } from "vitest";
import { assertRoutingDecisionInvariant, RoutingInvariantError } from "./invariant.js";

const input: RoutingResolutionInput = {
  protocol: "openai-chat",
  requestedModel: "demo-model",
};

const decision: RoutingDecision = {
  snapshotVersion: 1,
  ruleId: "default",
  requestedModel: "demo-model",
  target: {
    connectionId: "connection-1",
    credentialId: "credential-1",
    protocol: "openai-chat",
    origin: "https://provider.example",
    path: "/v1/chat/completions",
    upstreamModel: "provider-model",
  },
};

describe("routing invariant", () => {
  it("accepts a same-protocol, source-owned decision", () => {
    expect(() => assertRoutingDecisionInvariant(input, decision)).not.toThrow();
  });

  it.each([
    ["cross protocol", { ...decision, target: { ...decision.target, protocol: "anthropic-messages" as const } }],
    ["changed requested model", { ...decision, requestedModel: "other" }],
    ["invalid snapshot version", { ...decision, snapshotVersion: 0 }],
    ["origin with path", { ...decision, target: { ...decision.target, origin: "https://provider.example/base" } }],
    ["absolute upstream URL in path", { ...decision, target: { ...decision.target, path: "//evil.example/path" } }],
  ])("rejects %s", (_name, invalid) => {
    expect(() => assertRoutingDecisionInvariant(input, invalid)).toThrow(RoutingInvariantError);
  });
});
