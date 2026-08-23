import type { AppEnv } from "./bindings.js";
import type { ApplicationDependencies } from "./dependencies.js";
import { bodyLimit } from "hono/body-limit";

import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { createControlPlane } from "../control-plane/create-control-plane.js";
import { createRouter } from "../control-plane/http/create-router.js";
import { configureOpenApi } from "../control-plane/http/openapi/configure-openapi.js";
import { errorResponse } from "../control-plane/http/response.js";
import { createDataPlane } from "../data-plane/create-data-plane.js";
import { openAiErrorResponse } from "../data-plane/http/openai-error.js";
import { applicationErrorHandler } from "./error-handler.js";
import { registerWebAssets } from "./register-web-assets.js";
import { requestContext } from "./request-context.js";

export function createApplication(
  dependencies: ApplicationDependencies,
  options: { readonly webDistDirectory?: string } = {},
) {
  const app = createRouter<AppEnv>();
  app.use("*", requestContext(dependencies));
  app.use("*", secureHeaders());
  app.use("/admin/*", cors({ origin: dependencies.env.WEB_ORIGIN, credentials: true }));
  app.use("/api/auth/*", cors({ origin: dependencies.env.WEB_ORIGIN, credentials: true }));
  app.use("/admin/*", bodyLimit({ maxSize: 1024 * 1024 }));
  app.use("/api/auth/*", bodyLimit({ maxSize: 1024 * 1024 }));
  app.use("/openai/*", bodyLimit({ maxSize: 16 * 1024 * 1024 }));

  app.get("/healthz", c => c.json({ status: "ok" }));
  app.on(["GET", "POST"], "/api/auth/*", c => dependencies.controlAuth.handler(c.req.raw));
  app.route("/admin/api/v1", createControlPlane());
  app.route("/", createDataPlane());
  configureOpenApi(app);
  app.onError(applicationErrorHandler);
  app.notFound((c) => {
    if (c.req.path.startsWith("/openai"))
      return openAiErrorResponse(c, 404, "Data-plane route not found", "route_not_found");
    if (c.req.path.startsWith("/admin/api/"))
      return errorResponse(c, "COMMON_NOT_FOUND");
    return c.json({ error: "Not found", requestId: c.get("requestId") }, 404);
  });
  registerWebAssets(app, options.webDistDirectory);
  return app;
}
