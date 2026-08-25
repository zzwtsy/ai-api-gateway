import { describe, expect, it } from "vitest";

import { connectionDeepLink } from "./-deep-links";

describe("route-owned deep links", () => {
  it("omits absent connection state instead of serializing undefined values", () => {
    expect(connectionDeepLink()).toEqual({ to: "/connections", search: {} });
  });

  it("uses the canonical connection ID and tab search contract", () => {
    expect(connectionDeepLink("connection_01", "compatibility")).toEqual({
      to: "/connections",
      search: { connectionId: "connection_01", tab: "compatibility" },
    });
  });
});
