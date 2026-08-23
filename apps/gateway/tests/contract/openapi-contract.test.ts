import { describe, expect, it } from "vitest";

import { createApplication } from "../../src/app/create-application.js";
import { createInMemoryDependencies } from "../../src/app/create-dependencies.js";
import { EnvSchema } from "../../src/config/env-schema.js";
import { openApiDocumentConfig } from "../../src/control-plane/http/openapi/configure-openapi.js";
import { createLogger } from "../../src/core/logging/logger.js";

const env = EnvSchema.parse({ NODE_ENV: "test", STORAGE_DRIVER: "memory", LOG_LEVEL: "silent" });
const dependencies = createInMemoryDependencies(env, createLogger(env));
const app = createApplication(dependencies);
const document = app.getOpenAPIDocument(openApiDocumentConfig);

const operations = Object.values(document.paths ?? {}).flatMap(path =>
  Object.values(path ?? {}).filter((operation): operation is { operationId?: string; description?: string; tags?: string[]; responses?: object } =>
    typeof operation === "object" && operation !== null && "responses" in operation,
  ),
);

describe("control-plane OpenAPI", () => {
  it("has globally unique SDK-friendly operation IDs", () => {
    const ids = operations.map(operation => operation.operationId);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("documents every operation without data-plane provider DTOs", () => {
    for (const operation of operations) {
      expect(operation.description).toBeTruthy();
      expect(operation.tags?.length).toBeGreaterThan(0);
      expect(operation.responses).toBeDefined();
    }
    expect(document.paths).not.toHaveProperty("/openai/v1/chat/completions");
  });

  it("marks the create-connection JSON body as required", () => {
    expect(document.paths?.["/admin/api/v1/connections"]?.post?.requestBody).toMatchObject({ required: true });
  });

  it("mounts the Better Auth handler for nested auth paths", async () => {
    const response = await app.request("/api/auth/get-session");
    expect(response.status).toBe(503);
  });
});
