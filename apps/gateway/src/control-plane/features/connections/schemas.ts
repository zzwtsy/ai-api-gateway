import { z } from "@hono/zod-openapi";
import { connectionCreationLimits } from "./contracts.js";

const ConnectionProtocolSchema = z.enum([
  "openai-chat",
  "openai-responses",
  "anthropic-messages",
]).openapi("ConnectionProtocol");

const compatibilityProbeCheckValues = [
  "basic",
  "stream",
  "usage",
  "unknown_field",
  "tools",
  "reasoning",
  "structured_output",
  "error_shape",
  "harness",
] as const;

const CompatibilityProbeCheckSchema = z.enum(compatibilityProbeCheckValues).openapi("CompatibilityProbeCheck");

const BillingModeSchema = z.enum([
  "metered",
  "subscription",
  "free",
  "custom",
  "unknown",
]).openapi("BillingMode");

const connectionRefSchema = z.string().trim().min(1).max(100).regex(/^[A-Z0-9][\w.:-]*$/i);

const EndpointSchema = z.object({
  id: z.string().openapi({ description: "Endpoint ID" }),
  name: z.string().openapi({ description: "Endpoint 名称" }),
  protocol: ConnectionProtocolSchema,
  baseUrl: z.url().openapi({ description: "上游 Base URL" }),
  requestPath: z.string().openapi({ description: "上游请求路径" }),
  authScheme: z.enum(["bearer", "x-api-key"]),
  supportsStreaming: z.boolean(),
  status: z.enum(["active", "disabled"]),
}).openapi("UpstreamEndpoint");

const CredentialSchema = z.object({
  id: z.string().openapi({ description: "Credential ID" }),
  name: z.string().openapi({ description: "Credential 名称" }),
  maskedDisplay: z.string().openapi({ description: "只包含末四位的安全显示值" }),
  status: z.enum(["unverified", "healthy", "auth_failed", "unavailable", "disabled"]),
  endpointIds: z.array(z.string()),
  lastSuccessAt: z.iso.datetime().nullable(),
  lastFailureAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  rotatedAt: z.iso.datetime().nullable(),
  disabledAt: z.iso.datetime().nullable(),
}).openapi("ProviderCredential");

const AccountSchema = z.object({
  id: z.string().openapi({ description: "Provider Account ID" }),
  name: z.string().openapi({ description: "账号名称" }),
  billingMode: BillingModeSchema,
  status: z.enum(["active", "disabled"]),
  credentials: z.array(CredentialSchema),
}).openapi("ProviderAccount");

export const ConnectionSchema = z.object({
  id: z.string().openapi({ description: "Provider ID", example: "provider_01" }),
  name: z.string().openapi({ description: "连接名称", example: "本地模拟上游" }),
  providerSlug: z.string().openapi({ description: "Provider 稳定标识", example: "openai-compatible" }),
  presetKind: z.enum(["built-in", "custom"]),
  status: z.enum(["active", "disabled"]),
  endpoints: z.array(EndpointSchema),
  accounts: z.array(AccountSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi("Connection");

export const ConnectionIdParamSchema = z.object({
  connectionId: z.string().min(1).openapi({
    param: { name: "connectionId", in: "path" },
    description: "Provider ID",
  }),
});

export const ConnectionDeletionImpactSchema = z.object({
  endpointCount: z.number().int().nonnegative(),
  accountCount: z.number().int().nonnegative(),
  credentialCount: z.number().int().nonnegative(),
  credentialBindingCount: z.number().int().nonnegative(),
  modelBindingCount: z.number().int().nonnegative(),
  compatibilityProfileCount: z.number().int().nonnegative(),
  compatibilityFactCount: z.number().int().nonnegative(),
  completedProbeRunCount: z.number().int().nonnegative(),
  activeProbeRunCount: z.number().int().nonnegative(),
  blocked: z.boolean(),
  blockedReason: z.enum(["active_probe"]).nullable(),
}).openapi("ConnectionDeletionImpact");

export const ConnectionDeletionResultSchema = z.object({
  connectionId: z.string(),
}).openapi("ConnectionDeletionResult");

export const CredentialIdParamSchema = z.object({
  credentialId: z.string().min(1).openapi({
    param: { name: "credentialId", in: "path" },
    description: "Provider Credential ID",
  }),
});

export const EndpointIdParamSchema = z.object({
  endpointId: z.string().min(1).openapi({
    param: { name: "endpointId", in: "path" },
    description: "Endpoint ID",
  }),
});

const EndpointInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  protocol: ConnectionProtocolSchema,
  baseUrl: z.url(),
  requestPath: z.string().trim().regex(/^\/[\w.~!$&'()*+,;=:@%/-]*$/),
  authScheme: z.enum(["bearer", "x-api-key"]),
  supportsStreaming: z.boolean().default(true),
  credentialIds: z.array(z.string().min(1))
    .min(1)
    .max(connectionCreationLimits.maxCredentialBindingsPerEndpoint),
}).openapi("EndpointInput");

export const CreateConnectionBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  providerSlug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  endpoints: z.array(z.object({
    ref: connectionRefSchema.openapi({ description: "仅在本次请求内使用的 Endpoint 引用" }),
    name: z.string().trim().min(1).max(100),
    protocol: ConnectionProtocolSchema,
    baseUrl: z.url(),
    requestPath: z.string().trim().regex(/^\/[\w.~!$&'()*+,;=:@%/-]*$/),
    authScheme: z.enum(["bearer", "x-api-key"]),
    supportsStreaming: z.boolean().default(true),
    credentialRefs: z.array(connectionRefSchema)
      .min(1)
      .max(connectionCreationLimits.maxCredentialBindingsPerEndpoint)
      .openapi({ description: "本次请求内绑定的 Credential 引用" }),
  })).min(1).max(connectionCreationLimits.maxEndpoints),
  accounts: z.array(z.object({
    ref: connectionRefSchema.openapi({ description: "仅在本次请求内使用的 Account 引用" }),
    name: z.string().trim().min(1).max(100),
    billingMode: BillingModeSchema.default("unknown"),
    credentials: z.array(z.object({
      ref: connectionRefSchema.openapi({ description: "仅在本次请求内使用的 Credential 引用" }),
      name: z.string().trim().min(1).max(100),
      secret: z.string().min(1).max(16_384),
    })).min(1).max(connectionCreationLimits.maxCredentialsPerAccount),
  })).min(1).max(connectionCreationLimits.maxAccounts),
}).openapi("CreateConnectionBody");

export const AddConnectionEndpointBodySchema = z.object({
  endpoints: z.array(EndpointInputSchema)
    .min(1)
    .max(connectionCreationLimits.maxEndpoints),
}).openapi("AddConnectionEndpointsBody");

export const UpdateEndpointBodySchema = EndpointInputSchema.openapi("UpdateEndpointBody");

export const EndpointDeletionImpactSchema = z.object({
  credentialBindingCount: z.number().int().nonnegative(),
  modelBindingCount: z.number().int().nonnegative(),
  compatibilityProfileCount: z.number().int().nonnegative(),
  compatibilityFactCount: z.number().int().nonnegative(),
  completedProbeRunCount: z.number().int().nonnegative(),
  activeProbeRunCount: z.number().int().nonnegative(),
  blocked: z.boolean(),
}).openapi("EndpointDeletionImpact");

export const RotateCredentialBodySchema = z.object({
  secret: z.string().min(1).max(16_384),
}).openapi("RotateProviderCredentialBody");

export const ProbeCredentialBodySchema = z.object({
  endpointId: z.string().min(1),
  model: z.string().trim().min(1).max(200),
}).openapi("ProbeProviderCredentialBody");

export const CredentialProbeResultSchema = z.object({
  credentialId: z.string(),
  endpointId: z.string(),
  model: z.string(),
  outcome: z.enum(["succeeded", "failed"]),
  classification: z.enum(["healthy", "auth_failed", "rate_limited", "upstream_rejected", "unavailable"]),
  statusCode: z.number().int().nullable(),
  checkedAt: z.iso.datetime(),
}).openapi("ProviderCredentialProbeResult");

export const DiscoverUpstreamModelsBodySchema = z.object({
  credentialId: z.string().min(1),
  modelsPath: z.string()
    .trim()
    .regex(/^\/(?!\/)[\w.~!$&'()*+,;=:@%/-]*$/)
    .default("/v1/models"),
}).openapi("DiscoverUpstreamModelsBody");

export const UpstreamModelCatalogSchema = z.object({
  models: z.array(z.object({ id: z.string().min(1) })),
}).openapi("UpstreamModelCatalog");

export const StartCompatibilityProbeBodySchema = z.object({
  credentialId: z.string().min(1),
  model: z.string().trim().min(1).max(200),
}).openapi("StartCompatibilityProbeBody");

export const CompatibilityProbeRunSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  connectionId: z.string(),
  endpointId: z.string(),
  credentialId: z.string(),
  harnessProfileId: z.string(),
  model: z.string(),
  checks: z.array(CompatibilityProbeCheckSchema),
  status: z.enum(["queued", "running", "succeeded", "failed"]),
  totalChecks: z.number().int().nonnegative(),
  completedChecks: z.number().int().nonnegative(),
  currentCheck: z.enum(compatibilityProbeCheckValues).nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.iso.datetime(),
  startedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime(),
}).openapi("CompatibilityProbeRun");

const CompatibilityProfileSchema = z.object({
  id: z.string(),
  connectionId: z.string(),
  endpointId: z.string(),
  harnessProfileId: z.string(),
  status: z.enum(["verified", "documented", "partial", "unverified", "blocked"]),
  lastProbeAt: z.iso.datetime().nullable(),
  summary: z.string().nullable(),
}).openapi("CompatibilityProfile");

const CompatibilityFactSchema = z.object({
  profileId: z.string(),
  featureKey: z.string(),
  supportLevel: z.enum(["supported", "partial", "ignored", "unsupported", "degraded", "unknown"]),
  evidenceSource: z.enum(["documented", "probed", "manual"]),
  evidenceRef: z.string(),
  verifiedModelId: z.string(),
  verifiedAt: z.iso.datetime(),
  notes: z.string(),
}).openapi("CompatibilityFact");

export const ConnectionCompatibilitySchema = z.object({
  profiles: z.array(CompatibilityProfileSchema),
  facts: z.array(CompatibilityFactSchema),
  runs: z.array(CompatibilityProbeRunSchema),
}).openapi("ConnectionCompatibility");

export type ConnectionView = z.infer<typeof ConnectionSchema>;
export type CredentialProbeResultView = z.infer<typeof CredentialProbeResultSchema>;
export type UpstreamModelCatalogView = z.infer<typeof UpstreamModelCatalogSchema>;
export type CompatibilityProbeRunView = z.infer<typeof CompatibilityProbeRunSchema>;
export type ConnectionCompatibilityView = z.infer<typeof ConnectionCompatibilitySchema>;
