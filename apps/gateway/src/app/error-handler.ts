import type { ErrorHandler } from "hono";

import type { AppEnv } from "./bindings.js";
import { errorResponse } from "../control-plane/http/response.js";
import { AppError } from "../core/errors/app-error.js";
import { openAiErrorResponse } from "../data-plane/http/openai-error.js";

export const applicationErrorHandler: ErrorHandler<AppEnv> = (error, c) => {
  if (c.req.path.startsWith("/openai")) {
    c.get("logger").error({ err: error }, "unhandled data-plane error");
    return openAiErrorResponse(c, 500, "Internal gateway error", "gateway_internal_error");
  }
  if (error instanceof AppError) {
    return errorResponse(c, error.code, {
      ...(error.details === undefined ? {} : { details: error.details }),
    });
  }
  c.get("logger").error({ err: error }, "unhandled control-plane error");
  return errorResponse(c, "COMMON_INTERNAL_ERROR");
};
