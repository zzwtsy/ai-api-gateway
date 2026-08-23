import { z } from "@hono/zod-openapi";

const RequestOutcomeSchema = z.enum(["running", "succeeded", "failed", "client_cancelled"]);
const AttemptOutcomeSchema = z.enum(["running", "succeeded", "failed", "client_cancelled"]);

const AttemptSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  sequence: z.number().int().positive(),
  connectionId: z.string(),
  credentialId: z.string().openapi({ description: "不透明凭据 ID，不是 Secret 原文" }),
  upstreamModel: z.string(),
  outcome: AttemptOutcomeSchema,
  statusCode: z.number().int().nullable(),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
  errorCode: z.string().nullable(),
  fallbackReason: z.string().nullable(),
}).openapi("GatewayAttempt");

export const RequestSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  protocol: z.enum(["openai-chat", "openai-responses", "anthropic-messages"]),
  requestedModel: z.string(),
  upstreamModel: z.string(),
  routingSnapshotVersion: z.number().int().positive(),
  stream: z.boolean(),
  outcome: RequestOutcomeSchema,
  statusCode: z.number().int().nullable(),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
  latencyMs: z.number().int().nullable(),
  ttftMs: z.number().int().nullable(),
  observationStatus: z.enum(["pending", "complete", "incomplete"]),
  observedBytes: z.number().int().nonnegative(),
}).openapi("GatewayRequest");

export const RequestDetailSchema = RequestSchema.extend({
  attempts: z.array(AttemptSchema),
}).openapi("GatewayRequestDetail");

export const RequestListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const RequestIdParamSchema = z.object({
  requestId: z.string().min(1).openapi({
    param: { name: "requestId", in: "path" },
    description: "逻辑请求 ID",
  }),
});

export type RequestView = z.infer<typeof RequestSchema>;
export type RequestDetailView = z.infer<typeof RequestDetailSchema>;
