export const errorRegistry = {
  COMMON_OK: { status: 200, message: "成功", expose: true },
  COMMON_CREATED: { status: 201, message: "创建成功", expose: true },
  COMMON_VALIDATION_FAILED: { status: 422, message: "请求校验失败", expose: true },
  COMMON_UNAUTHORIZED: { status: 401, message: "未认证", expose: true },
  COMMON_NOT_FOUND: { status: 404, message: "资源不存在", expose: true },
  COMMON_CONFLICT: { status: 409, message: "资源冲突", expose: true },
  COMMON_INTERNAL_ERROR: { status: 500, message: "服务器内部错误", expose: false },
  CONNECTION_NOT_FOUND: { status: 404, message: "连接不存在", expose: true },
  CONNECTION_CONFLICT: { status: 409, message: "连接名称或 Endpoint 已存在", expose: true },
  REQUEST_NOT_FOUND: { status: 404, message: "请求不存在", expose: true },
} as const;

export type ErrorCode = keyof typeof errorRegistry;
export type ErrorType = "business" | "validation" | "internal";

export function errorTypeForCode(code: ErrorCode): ErrorType {
  if (code === "COMMON_VALIDATION_FAILED") {
    return "validation";
  }
  if (code === "COMMON_INTERNAL_ERROR") {
    return "internal";
  }
  return "business";
}
