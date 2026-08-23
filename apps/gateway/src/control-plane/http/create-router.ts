import type { BaseEnv } from "../../core/http/env.js";

import type { ControlEnv } from "./env.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import { errorResponse } from "./response.js";

export function createRouter<TEnv extends BaseEnv = ControlEnv>() {
  return new OpenAPIHono<TEnv>({
    defaultHook: (result, c) => {
      if (result.success) {
        return;
      }
      const details = result.error.issues.map(issue => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      c.get("logger").warn({ details }, "control-plane validation failed");
      return errorResponse(c, "COMMON_VALIDATION_FAILED", { details });
    },
  });
}
