import type {
  CompleteRequestWithAttemptInput,
  StartRequestWithAttemptInput,
} from "../../core/requests/contracts.js";

/** Assert Request/Attempt identity and chronology before publishing running state. */
export function assertStartRequestAttemptInvariant(input: StartRequestWithAttemptInput): void {
  assertNonEmpty("request.id", input.request.id);
  assertNonEmpty("request.clientId", input.request.clientId);
  assertNonEmpty("request.requestedModel", input.request.requestedModel);
  assertNonEmpty("request.upstreamModel", input.request.upstreamModel);
  assertNonEmpty("attempt.id", input.attempt.id);
  assertNonEmpty("attempt.requestId", input.attempt.requestId);
  assertNonEmpty("attempt.connectionId", input.attempt.connectionId);
  assertNonEmpty("attempt.credentialId", input.attempt.credentialId);

  if (input.attempt.requestId !== input.request.id) {
    throw new RecordingInvariantError("Attempt must belong to the Request published in the same operation");
  }
  if (input.attempt.upstreamModel !== input.request.upstreamModel) {
    throw new RecordingInvariantError("Request and first Attempt must record the same upstream model");
  }
  if (!Number.isSafeInteger(input.request.routingSnapshotVersion) || input.request.routingSnapshotVersion < 1) {
    throw new RecordingInvariantError("Request requires a positive routing snapshot version");
  }
  if (!Number.isSafeInteger(input.attempt.sequence) || input.attempt.sequence < 1) {
    throw new RecordingInvariantError("Attempt sequence must be a positive safe integer");
  }
  if (input.attempt.startedAt.getTime() < input.request.startedAt.getTime()) {
    throw new RecordingInvariantError("Attempt cannot start before its Request");
  }
}

/** Assert terminal metrics before replacing running state. */
export function assertCompleteRequestAttemptInvariant(input: CompleteRequestWithAttemptInput): void {
  assertNonEmpty("request.id", input.request.id);
  assertNonEmpty("attempt.id", input.attempt.id);
  if (!Number.isSafeInteger(input.request.latencyMs) || input.request.latencyMs < 0) {
    throw new RecordingInvariantError("latencyMs must be a non-negative safe integer");
  }
  if (input.request.ttftMs !== null
    && (!Number.isSafeInteger(input.request.ttftMs)
      || input.request.ttftMs < 0
      || input.request.ttftMs > input.request.latencyMs)) {
    throw new RecordingInvariantError("ttftMs must be null or between zero and latencyMs");
  }
  if (!Number.isSafeInteger(input.request.observedBytes) || input.request.observedBytes < 0) {
    throw new RecordingInvariantError("observedBytes must be a non-negative safe integer");
  }
}

export class RecordingInvariantError extends Error {
  public override readonly name = "RecordingInvariantError";
}

function assertNonEmpty(field: string, value: string): void {
  if (value.trim() === "")
    throw new RecordingInvariantError(`${field} must not be empty`);
}
