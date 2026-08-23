import type { ObservationSummary } from "./bounded-byte-observer.js";

export function assertObserverConfiguration(maxBufferBytes: number): void {
  if (!Number.isSafeInteger(maxBufferBytes) || maxBufferBytes < 1) {
    throw new ObservationInvariantError("Observer buffer must be a positive safe integer");
  }
}

export function assertObservationSummary(summary: ObservationSummary): void {
  if (!Number.isSafeInteger(summary.observedBytes) || summary.observedBytes < 0) {
    throw new ObservationInvariantError("observedBytes must be a non-negative safe integer");
  }
}

export class ObservationInvariantError extends Error {
  public override readonly name = "ObservationInvariantError";
}
