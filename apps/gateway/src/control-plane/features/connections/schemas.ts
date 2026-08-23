import { z } from "@hono/zod-openapi";

export const ConnectionProtocolSchema = z.enum([
  "openai-chat",
  "openai-responses",
  "anthropic-messages",
]).openapi("ConnectionProtocol");

export const ConnectionSchema = z.object({
  id: z.string().openapi({ description: "连接 ID", example: "conn_01" }),
  name: z.string().openapi({ description: "用户可读的连接名称", example: "本地模拟上游" }),
  provider: z.string().openapi({ description: "Provider 标识", example: "openai-compatible" }),
  protocol: ConnectionProtocolSchema,
  baseUrl: z.string().url().openapi({ description: "上游 Provider Base URL", example: "http://127.0.0.1:4010" }),
  enabled: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi("Connection");

export const ConnectionIdParamSchema = z.object({
  connectionId: z.string().min(1).openapi({
    param: { name: "connectionId", in: "path" },
    description: "连接 ID",
  }),
});

export const CreateConnectionBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  provider: z.string().trim().min(1).max(100),
  protocol: ConnectionProtocolSchema,
  baseUrl: z.string().url(),
  enabled: z.boolean().default(true),
}).openapi("CreateConnectionBody");

export type ConnectionView = z.infer<typeof ConnectionSchema>;
