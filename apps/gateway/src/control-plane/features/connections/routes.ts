import { createRoute, z } from "@hono/zod-openapi";

import { requireControlSession } from "../../auth/require-control-session.js";
import { jsonErrorResponse, jsonErrorResponses, jsonSuccessResponse } from "../../http/openapi/components.js";
import { controlSessionSecurity } from "../../http/openapi/security.js";
import {
  AddConnectionEndpointBodySchema,
  CompatibilityProbeRunSchema,
  ConnectionCompatibilitySchema,
  ConnectionDeletionImpactSchema,
  ConnectionDeletionResultSchema,
  ConnectionIdParamSchema,
  ConnectionSchema,
  CreateConnectionBodySchema,
  CredentialIdParamSchema,
  CredentialProbeResultSchema,
  DiscoverUpstreamModelsBodySchema,
  EndpointDeletionImpactSchema,
  EndpointIdParamSchema,
  ProbeCredentialBodySchema,
  RotateCredentialBodySchema,
  StartCompatibilityProbeBodySchema,
  UpdateEndpointBodySchema,
  UpstreamModelCatalogSchema,
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

export const getConnectionDeletionImpactRoute = createRoute({
  method: "get",
  path: "/connections/{connectionId}/deletion-impact",
  tags: ["Connections"],
  operationId: "getConnectionDeletionImpact",
  summary: "获取连接删除影响",
  description: "返回删除连接将清理的 Endpoint、账号、Credential、模型绑定和兼容性结果数量，并标记是否可以删除。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: { params: ConnectionIdParamSchema },
  responses: {
    200: jsonSuccessResponse(ConnectionDeletionImpactSchema, "连接删除影响"),
    ...authenticatedErrors,
    404: jsonErrorResponse("连接不存在", "CONNECTION_NOT_FOUND"),
  },
});

export const deleteConnectionRoute = createRoute({
  method: "delete",
  path: "/connections/{connectionId}",
  tags: ["Connections"],
  operationId: "deleteConnection",
  summary: "删除连接",
  description: "删除连接及其配置级联数据；历史 Request 与 Attempt 保留，进行中的兼容性测试会阻止删除。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: { params: ConnectionIdParamSchema },
  responses: {
    200: jsonSuccessResponse(ConnectionDeletionResultSchema, "连接已删除"),
    ...authenticatedErrors,
    404: jsonErrorResponse("连接不存在", "CONNECTION_NOT_FOUND"),
    409: jsonErrorResponse("连接存在进行中的兼容性测试，暂不能删除", "CONNECTION_ACTIVE_PROBE"),
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
      required: true,
      content: {
        "application/json": { schema: CreateConnectionBodySchema },
      },
    },
  },
  responses: {
    201: jsonSuccessResponse(ConnectionSchema, "连接已创建"),
    ...authenticatedErrors,
    422: jsonErrorResponse("连接批量配置校验失败", "COMMON_VALIDATION_FAILED"),
    409: jsonErrorResponse("连接名称或 Endpoint 已存在", "CONNECTION_CONFLICT"),
  },
});

export const addConnectionEndpointRoute = createRoute({
  method: "post",
  path: "/connections/{connectionId}/endpoints",
  tags: ["Connections"],
  operationId: "addConnectionEndpoints",
  summary: "添加上游 Endpoint",
  description: "为已有 Provider 原子添加一个或多个协议明确的 Endpoint，并绑定同一 Provider 下的可用 Credential。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: {
    params: ConnectionIdParamSchema,
    body: { required: true, content: { "application/json": { schema: AddConnectionEndpointBodySchema } } },
  },
  responses: {
    201: jsonSuccessResponse(ConnectionSchema, "Endpoint 已添加"),
    ...authenticatedErrors,
    422: jsonErrorResponse("Endpoint 批量配置校验失败", "COMMON_VALIDATION_FAILED"),
    404: jsonErrorResponse("连接或绑定的 Credential 不存在", "ENDPOINT_TARGET_NOT_FOUND"),
    409: jsonErrorResponse("Endpoint 名称或协议地址已存在", "CONNECTION_CONFLICT"),
  },
});

export const updateEndpointRoute = createRoute({
  method: "patch",
  path: "/endpoints/{endpointId}",
  tags: ["Connections"],
  operationId: "updateEndpoint",
  summary: "修改上游 Endpoint",
  description: "完整替换 Endpoint 的协议入口与 Credential 绑定；配置变化会清除兼容性事实并重置模型绑定状态。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: {
    params: EndpointIdParamSchema,
    body: { required: true, content: { "application/json": { schema: UpdateEndpointBodySchema } } },
  },
  responses: {
    200: jsonSuccessResponse(ConnectionSchema, "Endpoint 已修改"),
    ...authenticatedErrors,
    422: jsonErrorResponse("Endpoint 配置校验失败", "COMMON_VALIDATION_FAILED"),
    404: jsonErrorResponses("Endpoint 不存在，或绑定的上游 Credential 不存在", ["ENDPOINT_NOT_FOUND", "ENDPOINT_TARGET_NOT_FOUND"]),
    409: jsonErrorResponses("Endpoint 配置冲突，或存在进行中的兼容性测试", ["CONNECTION_CONFLICT", "ENDPOINT_ACTIVE_PROBE"]),
  },
});

export const getEndpointDeletionImpactRoute = createRoute({
  method: "get",
  path: "/endpoints/{endpointId}/deletion-impact",
  tags: ["Connections"],
  operationId: "getEndpointDeletionImpact",
  summary: "获取 Endpoint 删除影响",
  description: "返回删除 Endpoint 将级联清理的配置、模型绑定和兼容性结果数量，并标记是否有进行中的测试。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: { params: EndpointIdParamSchema },
  responses: {
    200: jsonSuccessResponse(EndpointDeletionImpactSchema, "Endpoint 删除影响"),
    ...authenticatedErrors,
    404: jsonErrorResponse("Endpoint 不存在", "ENDPOINT_NOT_FOUND"),
  },
});

export const deleteEndpointRoute = createRoute({
  method: "delete",
  path: "/endpoints/{endpointId}",
  tags: ["Connections"],
  operationId: "deleteEndpoint",
  summary: "删除上游 Endpoint",
  description: "删除 Endpoint 及其配置级联数据；历史 Request 与 Attempt 保留，进行中的兼容性测试会阻止删除。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: { params: EndpointIdParamSchema },
  responses: {
    200: jsonSuccessResponse(ConnectionSchema, "Endpoint 已删除"),
    ...authenticatedErrors,
    404: jsonErrorResponse("Endpoint 不存在", "ENDPOINT_NOT_FOUND"),
    409: jsonErrorResponse("Endpoint 存在进行中的兼容性测试，暂不能删除", "ENDPOINT_ACTIVE_PROBE"),
  },
});

export const rotateProviderCredentialRoute = createRoute({
  method: "post",
  path: "/provider-credentials/{credentialId}/rotate",
  tags: ["Connections"],
  operationId: "rotateProviderCredential",
  summary: "轮换上游凭据",
  description: "使用新的 Secret 替换 Provider Credential；完整 Secret 不会出现在响应中。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: {
    params: CredentialIdParamSchema,
    body: {
      required: true,
      content: { "application/json": { schema: RotateCredentialBodySchema } },
    },
  },
  responses: {
    200: jsonSuccessResponse(ConnectionSchema, "上游凭据已轮换"),
    ...authenticatedErrors,
    404: jsonErrorResponse("上游凭据不存在", "CREDENTIAL_NOT_FOUND"),
    409: jsonErrorResponse("上游凭据与现有 Secret 重复", "CREDENTIAL_CONFLICT"),
  },
});

export const disableProviderCredentialRoute = createRoute({
  method: "post",
  path: "/provider-credentials/{credentialId}/disable",
  tags: ["Connections"],
  operationId: "disableProviderCredential",
  summary: "禁用上游凭据",
  description: "禁用 Provider Credential，使其不再参与后续上游请求。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: { params: CredentialIdParamSchema },
  responses: {
    200: jsonSuccessResponse(ConnectionSchema, "上游凭据已禁用"),
    ...authenticatedErrors,
    404: jsonErrorResponse("上游凭据不存在", "CREDENTIAL_NOT_FOUND"),
  },
});

export const probeProviderCredentialRoute = createRoute({
  method: "post",
  path: "/provider-credentials/{credentialId}/probe",
  tags: ["Connections"],
  operationId: "probeProviderCredential",
  summary: "测试上游凭据",
  description: "显式使用指定 Endpoint、Credential 和模型发送最小上游请求。该操作可能产生 Provider 费用。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: {
    params: CredentialIdParamSchema,
    body: { required: true, content: { "application/json": { schema: ProbeCredentialBodySchema } } },
  },
  responses: {
    200: jsonSuccessResponse(CredentialProbeResultSchema, "上游凭据测试已完成"),
    ...authenticatedErrors,
    404: jsonErrorResponse("Credential 或绑定的 Endpoint 不存在", "CREDENTIAL_PROBE_TARGET_NOT_FOUND"),
    409: jsonErrorResponse("已禁用的 Credential 不能测试", "CREDENTIAL_DISABLED"),
  },
});

export const probeEndpointRoute = createRoute({
  method: "post",
  path: "/endpoints/{endpointId}/probe",
  tags: ["Connections"],
  operationId: "probeEndpoint",
  summary: "执行 Endpoint 完整兼容性测试",
  description: "使用绑定的 Credential 和指定模型异步测试协议与 Harness 能力；该操作会发送多次真实上游请求并可能产生费用。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: {
    params: EndpointIdParamSchema,
    body: { required: true, content: { "application/json": { schema: StartCompatibilityProbeBodySchema } } },
  },
  responses: {
    202: jsonSuccessResponse(CompatibilityProbeRunSchema, "兼容性测试已接受"),
    ...authenticatedErrors,
    404: jsonErrorResponse("Endpoint 或绑定的 Credential 不存在", "COMPATIBILITY_PROBE_TARGET_NOT_FOUND"),
    409: jsonErrorResponse("Endpoint 或 Credential 已禁用", "ENDPOINT_DISABLED"),
  },
});

export const discoverUpstreamModelsRoute = createRoute({
  method: "post",
  path: "/endpoints/{endpointId}/models/discover",
  tags: ["Connections"],
  operationId: "discoverUpstreamModels",
  summary: "获取上游模型目录",
  description: "显式使用绑定的 Credential 请求 OpenAI-compatible 模型目录；完整 Secret 不会返回浏览器。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: {
    params: EndpointIdParamSchema,
    body: { required: true, content: { "application/json": { schema: DiscoverUpstreamModelsBodySchema } } },
  },
  responses: {
    200: jsonSuccessResponse(UpstreamModelCatalogSchema, "上游模型目录"),
    ...authenticatedErrors,
    404: jsonErrorResponse("Endpoint 或绑定的 Credential 不存在", "MODEL_DISCOVERY_TARGET_NOT_FOUND"),
    409: jsonErrorResponse("Endpoint 或 Credential 已禁用", "ENDPOINT_DISABLED"),
    502: jsonErrorResponse("上游模型目录不可用或格式不兼容", "MODEL_DISCOVERY_FAILED"),
  },
});

export const getConnectionCompatibilityRoute = createRoute({
  method: "get",
  path: "/connections/{connectionId}/compatibility",
  tags: ["Connections"],
  operationId: "getConnectionCompatibility",
  summary: "获取连接兼容性事实",
  description: "返回连接下按 Endpoint、Harness Profile 和实测模型保存的兼容性事实与最近测试进度。",
  middleware: [requireControlSession()] as const,
  security: controlSessionSecurity,
  request: { params: ConnectionIdParamSchema },
  responses: {
    200: jsonSuccessResponse(ConnectionCompatibilitySchema, "连接兼容性事实"),
    ...authenticatedErrors,
    404: jsonErrorResponse("连接不存在", "CONNECTION_NOT_FOUND"),
  },
});

export type ListConnectionsRoute = typeof listConnectionsRoute;
export type GetConnectionRoute = typeof getConnectionRoute;
export type GetConnectionDeletionImpactRoute = typeof getConnectionDeletionImpactRoute;
export type DeleteConnectionRoute = typeof deleteConnectionRoute;
export type CreateConnectionRoute = typeof createConnectionRoute;
export type AddConnectionEndpointRoute = typeof addConnectionEndpointRoute;
export type UpdateEndpointRoute = typeof updateEndpointRoute;
export type GetEndpointDeletionImpactRoute = typeof getEndpointDeletionImpactRoute;
export type DeleteEndpointRoute = typeof deleteEndpointRoute;
export type RotateProviderCredentialRoute = typeof rotateProviderCredentialRoute;
export type DisableProviderCredentialRoute = typeof disableProviderCredentialRoute;
export type ProbeProviderCredentialRoute = typeof probeProviderCredentialRoute;
export type ProbeEndpointRoute = typeof probeEndpointRoute;
export type DiscoverUpstreamModelsRoute = typeof discoverUpstreamModelsRoute;
export type GetConnectionCompatibilityRoute = typeof getConnectionCompatibilityRoute;
