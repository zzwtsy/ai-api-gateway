import { createRoute, z } from "@hono/zod-openapi";

import { jsonSuccessResponse } from "../../http/openapi/components.js";

export const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  operationId: "getControlPlaneHealth",
  summary: "获取健康状态",
  description: "返回控制面进程健康状态，不代表所有上游 Provider 可用。",
  responses: {
    200: jsonSuccessResponse(z.object({ status: z.literal("ok") }), "控制面健康状态"),
  },
});

export type HealthRoute = typeof healthRoute;
