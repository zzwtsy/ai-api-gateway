import { describe, expect, it } from "vitest";

import {
  resolveConnectionDetailTab,
  toConnectionDetailTabSearch,
} from "./connection-detail-tabs";

const supportedTabs = ["overview", "endpoints", "accounts", "models", "compatibility"] as const;

describe("connection detail tab URL contract", () => {
  it.each(supportedTabs)("accepts the supported %s tab", (tab) => {
    expect(resolveConnectionDetailTab(tab)).toBe(tab);
  });

  it.each([undefined, "", "unknown"])(
    "falls back to overview for an unsupported value (%s)",
    (tab) => {
      expect(resolveConnectionDetailTab(tab)).toBe("overview");
    },
  );

  it("omits the default tab and preserves non-default tabs in search", () => {
    expect(toConnectionDetailTabSearch("overview")).toBeUndefined();
    expect(toConnectionDetailTabSearch("endpoints")).toBe("endpoints");
    expect(toConnectionDetailTabSearch("accounts")).toBe("accounts");
    expect(toConnectionDetailTabSearch("models")).toBe("models");
    expect(toConnectionDetailTabSearch("compatibility")).toBe("compatibility");
  });
});
