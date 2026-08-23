import { describe, expect, it } from "vitest";

import { createApplication } from "../../src/app/create-application.js";
import { createInMemoryDependencies } from "../../src/app/create-dependencies.js";
import { EnvSchema } from "../../src/config/env-schema.js";
import { createLogger } from "../../src/core/logging/logger.js";
import { StaticProviderCredentialResolver } from "../../src/data-plane/credentials/provider-credentials.js";

const env = EnvSchema.parse({
  NODE_ENV: "test",
  STORAGE_DRIVER: "memory",
  LOG_LEVEL: "silent",
});
const dependencies = createInMemoryDependencies(env, createLogger(env));
const app = createApplication(dependencies);

describe("Gateway Client credentials", () => {
  it("rejects requests without a Gateway Client Key", async () => {
    const response = await app.request("/openai/v1/chat/completions", { method: "POST" });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_api_key", message: "Missing Gateway Client Key" },
    });
  });

  it("rejects an invalid Gateway Client Key", async () => {
    const response = await app.request("/openai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: "Bearer invalid-gateway-key" },
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_api_key", message: "Invalid Gateway Client Key" },
    });
  });

  it("accepts x-api-key and reports an unavailable Provider Credential", async () => {
    const appWithoutProviderCredential = createApplication({
      ...dependencies,
      providerCredentialResolver: new StaticProviderCredentialResolver([]),
    });
    const response = await appWithoutProviderCredential.request("/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.GATEWAY_CLIENT_KEY,
      },
      body: JSON.stringify({ model: "demo-model" }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "credential_unavailable" },
    });
  });
});
