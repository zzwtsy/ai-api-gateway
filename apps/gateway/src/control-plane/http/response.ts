import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { BaseEnv } from "../../core/http/env.js";
import type { ErrorCode } from "../../core/errors/error-registry.js";
import { errorRegistry, errorTypeForCode } from "../../core/errors/error-registry.js";

export function successResponse<TEnv extends BaseEnv, TData>(
  c: Context<TEnv>,
  data: TData,
  options: { readonly message?: string; readonly status?: 200 | 201 } = {},
) {
  const status = options.status ?? 200;
  return c.json({
    success: true as const,
    code: status === 201 ? "COMMON_CREATED" as const : "COMMON_OK" as const,
    message: options.message ?? (status === 201 ? "创建成功" : "成功"),
    data,
    error: null,
    meta: { requestId: c.get("requestId") },
  }, status);
}

export function errorResponse<TEnv extends BaseEnv>(
  c: Context<TEnv>,
  code: ErrorCode,
  options: {
    readonly details?: ReadonlyArray<{ readonly path: string; readonly message: string }>;
  } = {},
) {
  const definition = errorRegistry[code];
  return c.json({
    success: false as const,
    code,
    message: definition.message,
    data: null,
    error: {
      type: errorTypeForCode(code),
      ...(options.details === undefined || !definition.expose ? {} : { details: options.details }),
    },
    meta: { requestId: c.get("requestId") },
  }, definition.status as ContentfulStatusCode);
}

