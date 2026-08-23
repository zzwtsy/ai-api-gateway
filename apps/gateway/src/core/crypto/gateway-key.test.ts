import { describe, expect, it } from "vitest";

import { gatewayKeyPrefix, hashGatewayKey, verifyGatewayKey } from "./gateway-key.js";

describe("Gateway Client Key", () => {
  it("stores only a deterministic HMAC and verifies in constant-time compatible form", () => {
    const hash = hashGatewayKey("gw_test_secret", "pepper-for-test");
    expect(hash.toString("utf8")).not.toContain("gw_test_secret");
    expect(verifyGatewayKey("gw_test_secret", hash, "pepper-for-test")).toBe(true);
    expect(verifyGatewayKey("wrong", hash, "pepper-for-test")).toBe(false);
  });

  it("exposes only a short prefix", () => {
    expect(gatewayKeyPrefix("gw_test_secret_value")).toBe("gw_test_se");
  });
});
