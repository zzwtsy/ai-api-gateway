import { z } from "@hono/zod-openapi";

export const ProviderModelBindingSchema = z.object({
  id: z.string(),
  endpointId: z.string(),
  upstreamModelId: z.string(),
  name: z.string(),
  status: z.enum(["unverified", "available", "deprecated", "unavailable"]),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi("ProviderModelBinding");
export const CreateProviderModelBindingBodySchema = z.object({
  endpointId: z.string().min(1),
  upstreamModelId: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(200),
}).openapi("CreateProviderModelBindingBody");
export type ProviderModelBindingView = z.infer<typeof ProviderModelBindingSchema>;
