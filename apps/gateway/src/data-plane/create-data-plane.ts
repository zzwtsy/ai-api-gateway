import type { DataEnv } from "./http/env.js";

import { Hono } from "hono";
import { requireGatewayClient } from "./credentials/require-gateway-client.js";
import { handleOpenAiChatCompletions } from "./protocols/openai-chat/handler.js";

export function createDataPlane() {
  const router = new Hono<DataEnv>();
  router.use("/openai/*", requireGatewayClient());
  router.post("/openai/v1/chat/completions", handleOpenAiChatCompletions);
  return router;
}
