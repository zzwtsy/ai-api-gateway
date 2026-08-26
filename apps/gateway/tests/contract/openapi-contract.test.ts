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

interface ErrorExamplesOperation {
  readonly responses?: Record<string, {
    readonly content?: Record<string, {
      readonly example?: { readonly code?: string };
      readonly examples?: Record<string, { readonly value?: { readonly code?: string } }>;
    }>;
  }>;
}

function expectErrorExampleCodes(operation: unknown, status: number, codes: readonly string[]) {
  const content = (operation as ErrorExamplesOperation).responses?.[String(status)]?.content?.["application/json"];
  if (codes.length === 1) {
    expect(content?.example?.code).toBe(codes[0]);
    expect(content?.examples).toBeUndefined();
    return;
  }
  const examples = content?.examples;
  expect(content?.example).toBeUndefined();
  expect(Object.keys(examples ?? {})).toEqual(codes);
  for (const code of codes)
    expect(examples?.[code]?.value?.code).toBe(code);
}

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

  it("publishes the asynchronous Endpoint compatibility contract", () => {
    expect(document.paths?.["/admin/api/v1/endpoints/{endpointId}/probe"]?.post).toMatchObject({
      operationId: "probeEndpoint",
      requestBody: { required: true },
      responses: { 202: expect.any(Object) },
    });
    expect(document.paths?.["/admin/api/v1/connections/{connectionId}/compatibility"]?.get).toMatchObject({
      operationId: "getConnectionCompatibility",
      responses: { 200: expect.any(Object) },
    });
  });

  it("publishes the connection deletion lifecycle and stable error codes", () => {
    const impact = document.paths?.["/admin/api/v1/connections/{connectionId}/deletion-impact"]?.get;
    const remove = document.paths?.["/admin/api/v1/connections/{connectionId}"]?.delete;

    expect(impact).toMatchObject({
      operationId: "getConnectionDeletionImpact",
      responses: {
        200: { content: { "application/json": { schema: { properties: { data: { $ref: "#/components/schemas/ConnectionDeletionImpact" } } } } } },
        404: expect.any(Object),
      },
    });
    expect(impact).not.toHaveProperty("requestBody");
    expect(remove).toMatchObject({
      operationId: "deleteConnection",
      responses: {
        200: { content: { "application/json": { schema: { properties: { data: { $ref: "#/components/schemas/ConnectionDeletionResult" } } } } } },
        404: expect.any(Object),
        409: expect.any(Object),
      },
    });
    expect(remove).not.toHaveProperty("requestBody");

    expectErrorExampleCodes(impact, 404, ["CONNECTION_NOT_FOUND"]);
    expectErrorExampleCodes(remove, 404, ["CONNECTION_NOT_FOUND"]);
    expectErrorExampleCodes(remove, 409, ["CONNECTION_ACTIVE_PROBE"]);
  });

  it("publishes the complete Endpoint lifecycle contract and stable error codes", () => {
    const add = document.paths?.["/admin/api/v1/connections/{connectionId}/endpoints"]?.post;
    const update = document.paths?.["/admin/api/v1/endpoints/{endpointId}"]?.patch;
    const impact = document.paths?.["/admin/api/v1/endpoints/{endpointId}/deletion-impact"]?.get;
    const remove = document.paths?.["/admin/api/v1/endpoints/{endpointId}"]?.delete;

    expect(add).toMatchObject({
      operationId: "addConnectionEndpoints",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/AddConnectionEndpointsBody" } } },
      },
      responses: {
        201: { content: { "application/json": { schema: { properties: { data: { $ref: "#/components/schemas/Connection" } } } } } },
        422: expect.any(Object),
        404: expect.any(Object),
        409: expect.any(Object),
      },
    });
    expect(update).toMatchObject({
      operationId: "updateEndpoint",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateEndpointBody" } } },
      },
      responses: {
        200: { content: { "application/json": { schema: { properties: { data: { $ref: "#/components/schemas/Connection" } } } } } },
        422: expect.any(Object),
        404: expect.any(Object),
        409: expect.any(Object),
      },
    });
    expect(impact).toMatchObject({
      operationId: "getEndpointDeletionImpact",
      responses: {
        200: { content: { "application/json": { schema: { properties: { data: { $ref: "#/components/schemas/EndpointDeletionImpact" } } } } } },
        404: expect.any(Object),
      },
    });
    expect(impact).not.toHaveProperty("requestBody");
    expect(remove).toMatchObject({
      operationId: "deleteEndpoint",
      responses: {
        200: { content: { "application/json": { schema: { properties: { data: { $ref: "#/components/schemas/Connection" } } } } } },
        404: expect.any(Object),
        409: expect.any(Object),
      },
    });
    expect(remove).not.toHaveProperty("requestBody");

    expectErrorExampleCodes(add, 422, ["COMMON_VALIDATION_FAILED"]);
    expectErrorExampleCodes(add, 404, ["ENDPOINT_TARGET_NOT_FOUND"]);
    expectErrorExampleCodes(add, 409, ["CONNECTION_CONFLICT"]);
    expectErrorExampleCodes(update, 422, ["COMMON_VALIDATION_FAILED"]);
    expectErrorExampleCodes(update, 404, ["ENDPOINT_NOT_FOUND", "ENDPOINT_TARGET_NOT_FOUND"]);
    expectErrorExampleCodes(update, 409, ["CONNECTION_CONFLICT", "ENDPOINT_ACTIVE_PROBE"]);
    expectErrorExampleCodes(impact, 404, ["ENDPOINT_NOT_FOUND"]);
    expectErrorExampleCodes(remove, 404, ["ENDPOINT_NOT_FOUND"]);
    expectErrorExampleCodes(remove, 409, ["ENDPOINT_ACTIVE_PROBE"]);
  });

  it("mounts the Better Auth handler for nested auth paths", async () => {
    const response = await app.request("/api/auth/get-session");
    expect(response.status).toBe(503);
  });
});
