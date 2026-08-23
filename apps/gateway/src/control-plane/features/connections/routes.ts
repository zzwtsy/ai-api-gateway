import { createRoute, z } from "@hono/zod-openapi";

import { requireControlSession } from "../../auth/require-control-session.js";
import { jsonErrorResponse, jsonSuccessResponse } from "../../http/openapi/components.js";
import { controlSessionSecurity } from "../../http/openapi/security.js";
import {
  ConnectionIdParamSchema,
  ConnectionSchema,
  CreateConnectionBodySchema,
} from "./schemas.js";

const authenticatedErrors = {
  401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
};

export const listConnectionsRoute = createRoute({
  method: "get",
  path: "/connections",
  tags: ["Connections"],
  operationId: "listConnections",
  summary: "列出连接",
  description: "列出所有 Provider Endpoint 连接。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  responses: {
    200: jsonSuccessResponse(z.array(ConnectionSchema), "连接列表"),
    ...authenticatedErrors,
  },
});

export const getConnectionRoute = createRoute({
  method: "get",
  path: "/connections/{connectionId}",
  tags: ["Connections"],
  operationId: "getConnectionById",
  summary: "获取连接",
  description: "根据连接 ID 获取 Provider Endpoint 配置。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: { params: ConnectionIdParamSchema },
  responses: {
    200: jsonSuccessResponse(ConnectionSchema, "连接详情"),
    ...authenticatedErrors,
    404: jsonErrorResponse("连接不存在", "CONNECTION_NOT_FOUND"),
  },
});

export const createConnectionRoute = createRoute({
  method: "post",
  path: "/connections",
  tags: ["Connections"],
  operationId: "createConnection",
  summary: "创建连接",
  description: "创建一个上游 Provider Endpoint；入口协议和目标协议必须保持一致。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: {
    body: {
      content: {
        "application/json": { schema: CreateConnectionBodySchema },
      },
    },
  },
  responses: {
    201: jsonSuccessResponse(ConnectionSchema, "连接已创建"),
    ...authenticatedErrors,
    409: jsonErrorResponse("连接名称或 Endpoint 已存在", "CONNECTION_CONFLICT"),
  },
});

export type ListConnectionsRoute = typeof listConnectionsRoute;
export type GetConnectionRoute = typeof getConnectionRoute;
export type CreateConnectionRoute = typeof createConnectionRoute;
