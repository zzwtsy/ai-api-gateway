import type { OpenAPIHono } from "@hono/zod-openapi";

import type { BaseEnv } from "../../../core/http/env.js";

import { apiReference } from "@scalar/hono-api-reference";

export const openApiDocumentConfig = {
  openapi: "3.0.3" as const,
  info: {
    title: "AI API Gateway 控制面 API",
    version: "0.1.0-alpha.3",
    description: "严格的控制面 API。数据面 Provider 请求与响应不属于此 OpenAPI 契约。",
  },
  servers: [{ url: "/" }],
};

export function configureOpenApi<TEnv extends BaseEnv>(app: OpenAPIHono<TEnv>): void {
  app.openAPIRegistry.registerComponent("securitySchemes", "CookieAuth", {
    type: "apiKey",
    in: "cookie",
    name: "better-auth.session_token",
  });
  app.openAPIRegistry.registerComponent("securitySchemes", "BearerAuth", {
    type: "http",
    scheme: "bearer",
    description: "仅非生产环境可用的开发控制面令牌。",
  });
  app.doc("/admin/openapi.json", openApiDocumentConfig);
  app.get("/admin/reference", apiReference({
    url: "/admin/openapi.json",
    theme: "default",
    pageTitle: "AI API Gateway 控制面 API",
  }));
}
