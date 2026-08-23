import { describe, expect, it } from "vitest";

import {
  assertObservationSummary,
  assertObserverConfiguration,
  ObservationInvariantError,
} from "./invariant.js";

describe("observation invariant", () => {
  it("accepts bounded configuration and non-negative summaries", () => {
    expect(() => assertObserverConfiguration(1)).not.toThrow();
    expect(() => assertObservationSummary({ status: "complete", observedBytes: 0, firstByteAt: null })).not.toThrow();
  });

  it("rejects unbounded or nonsensical values", () => {
    expect(() => assertObserverConfiguration(0)).toThrow(ObservationInvariantError);
    expect(() => assertObservationSummary({ status: "incomplete", observedBytes: -1, firstByteAt: null }))
      .toThrow(ObservationInvariantError);
  });
});
