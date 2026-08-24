import { z } from "@hono/zod-openapi";

const ClientProtocolSchema = z.enum(["openai-chat", "openai-responses", "anthropic-messages"]);

export const HarnessProfileSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  allowedProtocols: z.array(ClientProtocolSchema),
}).openapi("HarnessProfile");

const GatewayClientKeySchema = z.object({
  id: z.string(),
  keyPrefix: z.string(),
  keyLast4: z.string(),
  status: z.enum(["active", "expiring", "revoked"]),
  expiresAt: z.iso.datetime().nullable(),
  lastUsedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  revokedAt: z.iso.datetime().nullable(),
}).openapi("GatewayClientKey");

export const GatewayClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["active", "disabled"]),
  profile: HarnessProfileSchema,
  allowedProtocols: z.array(ClientProtocolSchema),
  keys: z.array(GatewayClientKeySchema),
  lastUsedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi("GatewayClient");

export const GatewayClientWithSecretSchema = z.object({
  client: GatewayClientSchema,
  key: z.string().openapi({ description: "只在本次响应返回的完整 Gateway Client Key" }),
}).openapi("GatewayClientWithSecret");

export const CreateGatewayClientBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  profileSlug: z.string().trim().min(1).max(100),
  allowedProtocols: z.array(ClientProtocolSchema).min(1),
}).openapi("CreateGatewayClientBody");

export const ClientIdParamSchema = z.object({ clientId: z.string().min(1).openapi({ param: { name: "clientId", in: "path" } }) });
export const ClientKeyIdParamSchema = z.object({ keyId: z.string().min(1).openapi({ param: { name: "keyId", in: "path" } }) });
export const RotateGatewayClientKeyBodySchema = z.object({ overlapHours: z.number().int().min(0).max(168).default(24) });

export type GatewayClientView = z.infer<typeof GatewayClientSchema>;
