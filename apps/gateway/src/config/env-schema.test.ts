import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";

import { EnvSchema } from "./env-schema.js";

describe("EnvSchema production safety", () => {
  it("rejects memory storage and fixture or placeholder secrets", () => {
    const result = EnvSchema.safeParse({
      NODE_ENV: "production",
      STORAGE_DRIVER: "memory",
      BETTER_AUTH_SECRET: "replace-with-at-least-32-random-characters",
      GATEWAY_CLIENT_KEY: "gw_dev_local_key",
      GATEWAY_KEY_PEPPER: "replace-with-a-random-pepper",
      PROVIDER_SECRET_ACTIVE_KEY_ID: "development-v1",
      PROVIDER_SECRET_KEYRING: JSON.stringify({
        "development-v1": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      }),
      PROVIDER_SECRET_FINGERPRINT_PEPPER: "replace-with-a-provider-fingerprint-pepper",
      BOOTSTRAP_PROVIDER_BASE_URL: "http://127.0.0.1:4010",
      BOOTSTRAP_PROVIDER_API_KEY: "mock-provider-key",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = new Set(result.error.issues.flatMap(issue => issue.path.map(String)));
      expect(fields.has("STORAGE_DRIVER")).toBe(true);
      expect(fields.has("BETTER_AUTH_SECRET")).toBe(true);
      expect(fields.has("GATEWAY_CLIENT_KEY")).toBe(true);
      expect(fields.has("GATEWAY_KEY_PEPPER")).toBe(true);
      expect(fields.has("PROVIDER_SECRET_ACTIVE_KEY_ID")).toBe(true);
      expect(fields.has("PROVIDER_SECRET_KEYRING")).toBe(true);
      expect(fields.has("PROVIDER_SECRET_FINGERPRINT_PEPPER")).toBe(true);
      expect(fields.has("BOOTSTRAP_PROVIDER_BASE_URL")).toBe(true);
      expect(fields.has("BOOTSTRAP_PROVIDER_API_KEY")).toBe(true);
    }
  });

  it("accepts explicitly configured production bootstrap values", () => {
    expect(EnvSchema.safeParse({
      NODE_ENV: "production",
      STORAGE_DRIVER: "postgres",
      BETTER_AUTH_SECRET: "b".repeat(48),
      GATEWAY_CLIENT_KEY: "g".repeat(40),
      GATEWAY_KEY_PEPPER: "p".repeat(40),
      PROVIDER_SECRET_ACTIVE_KEY_ID: "production-v1",
      PROVIDER_SECRET_KEYRING: JSON.stringify({
        "production-v1": Buffer.alloc(32, 9).toString("base64"),
      }),
      PROVIDER_SECRET_FINGERPRINT_PEPPER: "f".repeat(40),
      BOOTSTRAP_PROVIDER_BASE_URL: "https://provider.example",
      BOOTSTRAP_PROVIDER_API_KEY: "provider-secret",
    }).success).toBe(true);
  });

  it("rejects an active Provider Secret key that is absent from the keyring", () => {
    const result = EnvSchema.safeParse({
      PROVIDER_SECRET_ACTIVE_KEY_ID: "missing",
    });
    expect(result.success).toBe(false);
  });
});
