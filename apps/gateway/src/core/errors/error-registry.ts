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
  CREDENTIAL_NOT_FOUND: { status: 404, message: "上游凭据不存在", expose: true },
  CREDENTIAL_CONFLICT: { status: 409, message: "上游凭据与现有 Secret 重复", expose: true },
  CREDENTIAL_PROBE_TARGET_NOT_FOUND: { status: 404, message: "Credential 或绑定的 Endpoint 不存在", expose: true },
  CREDENTIAL_DISABLED: { status: 409, message: "已禁用的 Credential 不能测试", expose: true },
  ENDPOINT_DISABLED: { status: 409, message: "已禁用的 Endpoint 不能测试", expose: true },
  ENDPOINT_TARGET_NOT_FOUND: { status: 404, message: "连接或绑定的上游凭据不存在", expose: true },
  COMPATIBILITY_PROBE_TARGET_NOT_FOUND: { status: 404, message: "Endpoint 或绑定的 Credential 不存在", expose: true },
  HARNESS_PROFILE_NOT_FOUND: { status: 404, message: "Harness Profile 不存在", expose: true },
  CLIENT_NOT_FOUND: { status: 404, message: "客户端不存在", expose: true },
  CLIENT_KEY_NOT_FOUND: { status: 404, message: "客户端 Key 不存在", expose: true },
  CLIENT_CONFLICT: { status: 409, message: "客户端名称已存在", expose: true },
  CLIENT_PROTOCOL_NOT_ALLOWED: { status: 422, message: "客户端协议超出 Harness 允许范围", expose: true },
  MODEL_BINDING_CONFLICT: { status: 409, message: "模型绑定已存在", expose: true },
  MODEL_ENDPOINT_NOT_FOUND: { status: 404, message: "模型绑定的 Endpoint 不存在", expose: true },
  MODEL_DISCOVERY_TARGET_NOT_FOUND: { status: 404, message: "Endpoint 或绑定的 Credential 不存在", expose: true },
  MODEL_DISCOVERY_FAILED: { status: 502, message: "无法从上游获取兼容的模型目录", expose: true },
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
