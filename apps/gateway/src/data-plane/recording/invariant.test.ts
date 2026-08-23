import { describe, expect, it } from "vitest";

import type {
  CompleteRequestWithAttemptInput,
  StartRequestWithAttemptInput,
} from "../../core/requests/contracts.js";
import {
  assertCompleteRequestAttemptInvariant,
  assertStartRequestAttemptInvariant,
  RecordingInvariantError,
} from "./invariant.js";

const startedAt = new Date("2026-08-22T00:00:00.000Z");
const start: StartRequestWithAttemptInput = {
  request: {
    id: "request-1",
    clientId: "client-1",
    protocol: "openai-chat",
    requestedModel: "demo-model",
    upstreamModel: "provider-model",
    routingSnapshotVersion: 1,
    stream: true,
    startedAt,
  },
  attempt: {
    id: "attempt-1",
    requestId: "request-1",
    sequence: 1,
    connectionId: "connection-1",
    credentialId: "credential-1",
    upstreamModel: "provider-model",
    startedAt,
  },
};

const complete: CompleteRequestWithAttemptInput = {
  request: {
    id: "request-1",
    outcome: "succeeded",
    statusCode: 200,
    finishedAt: new Date("2026-08-22T00:00:00.040Z"),
    latencyMs: 40,
    ttftMs: 10,
    observationStatus: "complete",
    observedBytes: 80,
  },
  attempt: {
    id: "attempt-1",
    outcome: "succeeded",
    statusCode: 200,
    finishedAt: new Date("2026-08-22T00:00:00.040Z"),
  },
};

describe("recording invariant", () => {
  it("accepts one coherent Request/Attempt publication", () => {
    expect(() => assertStartRequestAttemptInvariant(start)).not.toThrow();
    expect(() => assertCompleteRequestAttemptInvariant(complete)).not.toThrow();
  });

  it("rejects an Attempt attached to another Request", () => {
    expect(() => assertStartRequestAttemptInvariant({
      ...start,
      attempt: { ...start.attempt, requestId: "request-2" },
    })).toThrow(RecordingInvariantError);
  });

  it("rejects terminal metrics that cannot describe one request", () => {
    expect(() => assertCompleteRequestAttemptInvariant({
      ...complete,
      request: { ...complete.request, latencyMs: 10, ttftMs: 20 },
    })).toThrow(RecordingInvariantError);
  });
});
