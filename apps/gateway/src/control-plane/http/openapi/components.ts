import type { ZodType } from "zod";
import type { ErrorCode } from "../../../core/errors/error-registry.js";

import { z } from "@hono/zod-openapi";
import { errorRegistry, errorTypeForCode } from "../../../core/errors/error-registry.js";

const ErrorCodeSchema = z.enum(Object.keys(errorRegistry) as [ErrorCode, ...ErrorCode[]]).openapi("ErrorCode");

const ResponseMetaSchema = z.object({
  requestId: z.string().openapi({ description: "请求关联 ID" }),
}).openapi("ResponseMeta");

const ErrorDetailSchema = z.object({
  path: z.string(),
  message: z.string(),
}).openapi("ErrorDetail");

const ErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  code: ErrorCodeSchema,
  message: z.string(),
  data: z.null(),
  error: z.object({
    type: z.enum(["business", "validation", "internal"]),
    details: z.array(ErrorDetailSchema).optional(),
  }),
  meta: ResponseMetaSchema,
}).openapi("ErrorEnvelope");

function createSuccessEnvelopeSchema<TSchema extends ZodType>(schema: TSchema) {
  return z.object({
    success: z.literal(true),
    code: z.enum(["COMMON_OK", "COMMON_CREATED"]),
    message: z.string(),
    data: schema,
    error: z.null(),
    meta: ResponseMetaSchema,
  });
}

export function jsonSuccessResponse<TSchema extends ZodType>(schema: TSchema, description: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: createSuccessEnvelopeSchema(schema),
      },
    },
  };
}

export function jsonErrorResponse(description: string, code: ErrorCode) {
  const definition = errorRegistry[code];
  return {
    description,
    content: {
      "application/json": {
        schema: ErrorEnvelopeSchema,
        example: {
          success: false,
          code,
          message: definition.message,
          data: null,
          error: { type: errorTypeForCode(code) },
          meta: { requestId: "req_example" },
        },
      },
    },
  };
}
