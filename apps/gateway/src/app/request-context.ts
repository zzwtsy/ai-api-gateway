import { randomUUID } from "node:crypto";

import { createMiddleware } from "hono/factory";

import type { AppEnv } from "./bindings.js";
import type { ApplicationDependencies } from "./dependencies.js";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function requestContext(dependencies: ApplicationDependencies) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const suppliedRequestId = c.req.header("x-request-id");
    const requestId = suppliedRequestId !== undefined && REQUEST_ID_PATTERN.test(suppliedRequestId)
      ? suppliedRequestId
      : randomUUID();
    const logger = dependencies.logger.child({ requestId });
    c.set("controlDependencies", dependencies);
    c.set("dataDependencies", dependencies);
    c.set("requestId", requestId);
    c.set("logger", logger);
    c.header("x-request-id", requestId);
    await next();
  });
}
