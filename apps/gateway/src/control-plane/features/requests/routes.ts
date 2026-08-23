import { createRoute, z } from "@hono/zod-openapi";

import { requireControlSession } from "../../auth/require-control-session.js";
import { jsonErrorResponse, jsonSuccessResponse } from "../../http/openapi/components.js";
import { controlSessionSecurity } from "../../http/openapi/security.js";
import {
  RequestDetailSchema,
  RequestIdParamSchema,
  RequestListQuerySchema,
  RequestSchema,
} from "./schemas.js";

export const listRequestsRoute = createRoute({
  method: "get",
  path: "/requests",
  tags: ["Requests"],
  operationId: "listGatewayRequests",
  summary: "列出请求",
  description: "列出逻辑请求；上游重试仍归属于同一逻辑请求。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: { query: RequestListQuerySchema },
  responses: {
    200: jsonSuccessResponse(z.array(RequestSchema), "逻辑请求列表"),
    401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
  },
});

export const getRequestRoute = createRoute({
  method: "get",
  path: "/requests/{requestId}",
  tags: ["Requests"],
  operationId: "getGatewayRequestById",
  summary: "获取请求详情",
  description: "返回一次逻辑请求及其完整上游尝试链。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: { params: RequestIdParamSchema },
  responses: {
    200: jsonSuccessResponse(RequestDetailSchema, "逻辑请求详情"),
    401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
    404: jsonErrorResponse("请求不存在", "REQUEST_NOT_FOUND"),
  },
});

export type ListRequestsRoute = typeof listRequestsRoute;
export type GetRequestRoute = typeof getRequestRoute;
