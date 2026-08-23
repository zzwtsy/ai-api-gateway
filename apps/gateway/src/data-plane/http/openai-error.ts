import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { DataEnv } from "./env.js";

export function openAiErrorResponse<TEnv extends DataEnv>(
  c: Context<TEnv>,
  status: ContentfulStatusCode,
  message: string,
  code: string,
) {
  return c.json({
    error: {
      message,
      type: "invalid_request_error",
      param: null,
      code,
    },
  }, status);
}
