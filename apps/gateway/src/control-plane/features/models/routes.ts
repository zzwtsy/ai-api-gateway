import { createRoute, z } from "@hono/zod-openapi";
import { requireControlSession } from "../../auth/require-control-session.js";
import { jsonErrorResponse, jsonSuccessResponse } from "../../http/openapi/components.js";
import { controlSessionSecurity } from "../../http/openapi/security.js";
import { CreateProviderModelBindingBodySchema, ProviderModelBindingSchema } from "./schemas.js";

const auth = { 401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED") };
export const listProviderModelBindingsRoute = createRoute({ method: "get", path: "/models", tags: ["Models"], operationId: "listProviderModelBindings", summary: "列出模型绑定", description: "列出 Endpoint 接受的最小上游模型绑定。", middleware: [requireControlSession()] as const, security: controlSessionSecurity, responses: { 200: jsonSuccessResponse(z.array(ProviderModelBindingSchema), "模型绑定列表"), ...auth } });
export const createProviderModelBindingRoute = createRoute({ method: "post", path: "/models", tags: ["Models"], operationId: "createProviderModelBinding", summary: "创建模型绑定", description: "为指定 Endpoint 创建一个明确的上游模型 ID。", middleware: [requireControlSession()] as const, security: controlSessionSecurity, request: { body: { required: true, content: { "application/json": { schema: CreateProviderModelBindingBodySchema } } } }, responses: { 201: jsonSuccessResponse(ProviderModelBindingSchema, "模型绑定已创建"), ...auth, 404: jsonErrorResponse("模型绑定的 Endpoint 不存在", "MODEL_ENDPOINT_NOT_FOUND"), 409: jsonErrorResponse("模型绑定已存在", "MODEL_BINDING_CONFLICT") } });
export type ListProviderModelBindingsRoute = typeof listProviderModelBindingsRoute;
export type CreateProviderModelBindingRoute = typeof createProviderModelBindingRoute;
