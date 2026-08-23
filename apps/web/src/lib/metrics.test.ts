import { describe, expect, it } from "vitest";

import { averageInteger } from "./metrics";

describe("averageInteger", () => {
  it("distinguishes an empty measurement set from a numeric zero", () => {
    expect(averageInteger([])).toBeNull();
    expect(averageInteger([0])).toBe(0);
  });

  it("rounds the calculated metric for compact dashboard display", () => {
    expect(averageInteger([10, 11, 12, 14])).toBe(12);
  });
});
