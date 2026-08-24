import { describe, expect, it } from "vitest";

import { gatewayKeyPrefix, generateGatewayKey, hashGatewayKey, verifyGatewayKey } from "./gateway-key.js";

describe("Gateway Client Key", () => {
  it("stores only a deterministic HMAC and verifies in constant-time compatible form", () => {
    const hash = hashGatewayKey("gw_test_secret", "pepper-for-test");
    expect(hash.toString("utf8")).not.toContain("gw_test_secret");
    expect(verifyGatewayKey("gw_test_secret", hash, "pepper-for-test")).toBe(true);
    expect(verifyGatewayKey("wrong", hash, "pepper-for-test")).toBe(false);
    expect(verifyGatewayKey("gw_test_secret", hash.subarray(0, hash.byteLength - 1), "pepper-for-test")).toBe(false);
  });

  it("exposes only a short prefix", () => {
    expect(gatewayKeyPrefix("gw_test_secret_value")).toBe("gw_test_se");
  });

  it("generates a profile-labelled key with 256 bits of random material", () => {
    const key = generateGatewayKey("generic-openai-chat");
    expect(key).toMatch(/^gw_generic-openai-chat_[\w-]{43}$/);
    expect(generateGatewayKey("generic-openai-chat")).not.toBe(key);
  });

  it("rejects profile slugs without an ASCII letter or number", () => {
    expect(() => generateGatewayKey("---")).toThrow("must contain an ASCII letter or number");
  });
});
