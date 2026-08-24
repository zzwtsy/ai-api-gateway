import { createRoute, z } from "@hono/zod-openapi";

import { requireControlSession } from "../../auth/require-control-session.js";
import { jsonErrorResponse, jsonSuccessResponse } from "../../http/openapi/components.js";
import { controlSessionSecurity } from "../../http/openapi/security.js";
import {
  ClientIdParamSchema,
  ClientKeyIdParamSchema,
  CreateGatewayClientBodySchema,
  GatewayClientSchema,
  GatewayClientWithSecretSchema,
  HarnessProfileSchema,
  RotateGatewayClientKeyBodySchema,
} from "./schemas.js";

const authErrors = { 401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED") };

export const listHarnessProfilesRoute = createRoute({
  method: "get",
  path: "/harness-profiles",
  tags: ["Clients"],
  operationId: "listHarnessProfiles",
  summary: "列出 Harness 类型",
  description: "列出创建 Gateway Client 时可用的 Harness Profile。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  responses: { 200: jsonSuccessResponse(z.array(HarnessProfileSchema), "Harness Profile 列表"), ...authErrors },
});

export const listGatewayClientsRoute = createRoute({
  method: "get",
  path: "/clients",
  tags: ["Clients"],
  operationId: "listGatewayClients",
  summary: "列出客户端",
  description: "列出 Gateway Client 与脱敏 Key 元数据。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  responses: { 200: jsonSuccessResponse(z.array(GatewayClientSchema), "客户端列表"), ...authErrors },
});

export const createGatewayClientRoute = createRoute({
  method: "post",
  path: "/clients",
  tags: ["Clients"],
  operationId: "createGatewayClient",
  summary: "创建客户端",
  description: "创建 Gateway Client；完整 Key 只在本次响应返回。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: { body: { required: true, content: { "application/json": { schema: CreateGatewayClientBodySchema } } } },
  responses: {
    201: jsonSuccessResponse(GatewayClientWithSecretSchema, "客户端已创建"),
    ...authErrors,
    404: jsonErrorResponse("Harness Profile 不存在", "HARNESS_PROFILE_NOT_FOUND"),
    409: jsonErrorResponse("客户端名称已存在", "CLIENT_CONFLICT"),
    422: jsonErrorResponse("客户端协议超出 Harness 允许范围", "CLIENT_PROTOCOL_NOT_ALLOWED"),
  },
});

export const rotateGatewayClientKeyRoute = createRoute({
  method: "post",
  path: "/clients/{clientId}/keys/rotate",
  tags: ["Clients"],
  operationId: "rotateGatewayClientKey",
  summary: "轮换客户端 Key",
  description: "创建新 Key，并为旧 Key 设置有限重叠窗口。完整新 Key 只返回一次。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: { params: ClientIdParamSchema, body: { required: true, content: { "application/json": { schema: RotateGatewayClientKeyBodySchema } } } },
  responses: { 200: jsonSuccessResponse(GatewayClientWithSecretSchema, "客户端 Key 已轮换"), ...authErrors, 404: jsonErrorResponse("客户端不存在", "CLIENT_NOT_FOUND") },
});

export const revokeGatewayClientKeyRoute = createRoute({
  method: "post",
  path: "/client-keys/{keyId}/revoke",
  tags: ["Clients"],
  operationId: "revokeGatewayClientKey",
  summary: "撤销客户端 Key",
  description: "立即撤销指定 Gateway Client Key。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: { params: ClientKeyIdParamSchema },
  responses: { 200: jsonSuccessResponse(GatewayClientSchema, "客户端 Key 已撤销"), ...authErrors, 404: jsonErrorResponse("客户端 Key 不存在", "CLIENT_KEY_NOT_FOUND") },
});

export type ListHarnessProfilesRoute = typeof listHarnessProfilesRoute;
export type ListGatewayClientsRoute = typeof listGatewayClientsRoute;
export type CreateGatewayClientRoute = typeof createGatewayClientRoute;
export type RotateGatewayClientKeyRoute = typeof rotateGatewayClientKeyRoute;
export type RevokeGatewayClientKeyRoute = typeof revokeGatewayClientKeyRoute;
