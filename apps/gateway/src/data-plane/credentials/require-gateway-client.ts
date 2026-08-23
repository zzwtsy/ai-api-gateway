import type { DataEnv } from "../http/env.js";

import { createMiddleware } from "hono/factory";
import { openAiErrorResponse } from "../http/openai-error.js";

export function requireGatewayClient() {
  return createMiddleware<DataEnv>(async (c, next) => {
    const key = readGatewayKey(c.req.header("authorization"), c.req.header("x-api-key"));
    if (key === null) {
      return openAiErrorResponse(c, 401, "Missing Gateway Client Key", "invalid_api_key");
    }
    const identity = await c.get("dataDependencies").gatewayClientAuthenticator.authenticate(key);
    if (identity === null) {
      return openAiErrorResponse(c, 401, "Invalid Gateway Client Key", "invalid_api_key");
    }
    c.set("gatewayClient", identity);
    await next();
  });
}

function readGatewayKey(authorization: string | undefined, apiKey: string | undefined): string | null {
  if (authorization?.startsWith("Bearer ") === true) {
    return authorization.slice("Bearer ".length);
  }
  return apiKey ?? null;
}
