import type { components } from "@/api/schema";

type RequestDetailRecord = components["schemas"]["GatewayRequestDetail"];
type DiagnosticTone = "success" | "warning" | "danger" | "neutral";

export interface DiagnosticResult {
  readonly title: string;
  readonly description: string;
  readonly tone: DiagnosticTone;
  readonly actionText?: string | undefined;
  readonly actionLink?: "/connections" | "/models" | undefined;
  readonly actionConnectionId?: string | undefined;
}

export function diagnoseRequest(detail: RequestDetailRecord): DiagnosticResult {
  const { outcome, upstreamModel } = detail;

  if (outcome === "running") {
    return {
      title: "请求正在处理中",
      description: `网关已接受发往目标模型 ${upstreamModel} 的请求，正在等待或传输上游响应。`,
      tone: "neutral",
    };
  }

  if (outcome === "client_cancelled") {
    return {
      title: "客户端主动取消请求",
      description: "发起调用的 Harness 或客户端在收到完整响应前断开了连接。",
      tone: "warning",
    };
  }

  if (outcome === "succeeded") {
    return diagnoseSucceeded(detail);
  }

  return diagnoseFailed(detail);
}

function diagnoseSucceeded(detail: RequestDetailRecord): DiagnosticResult {
  const { attempts, latencyMs, ttftMs } = detail;

  if (attempts.length > 1) {
    const lastFailed = attempts.filter(attempt => attempt.outcome === "failed").at(-1);
    if (lastFailed === undefined) {
      return {
        title: "请求已通过多次上游尝试完成",
        description: `共记录 ${attempts.length} 次 Attempt，未记录失败尝试；请求总延迟 ${latencyMs ?? "—"} ms。`,
        tone: "neutral",
      };
    }
    const failedCode = lastFailed.statusCode !== null
      ? ` (HTTP ${lastFailed.statusCode})`
      : "";
    return {
      title: "请求已通过备用目标成功完成",
      description: `第 ${lastFailed.sequence} 次尝试失败${failedCode}，网关随后成功完成请求，总延迟 ${latencyMs ?? "—"} ms。`,
      tone: "warning",
    };
  }

  return {
    title: "请求执行正常",
    description: `直连上游成功。TTFT 首包耗时 ${ttftMs ?? "—"} ms，总耗时 ${latencyMs ?? "—"} ms。`,
    tone: "success",
  };
}

function diagnoseFailed(detail: RequestDetailRecord): DiagnosticResult {
  const { attempts, requestedModel, upstreamModel } = detail;
  const failedAttempt = attempts.find(a => a.outcome === "failed") ?? attempts[attempts.length - 1];
  const statusCode = failedAttempt?.statusCode;

  if (statusCode === 401 || statusCode === 403) {
    return {
      title: `上游鉴权失败 (HTTP ${statusCode})`,
      description: "上游 Provider 拒绝了当前凭据密钥。请检查该连接的 API Key 是否有效、是否欠费或已过期。",
      tone: "danger",
      actionText: "前往连接管理",
      actionLink: "/connections",
      actionConnectionId: failedAttempt?.connectionId,
    };
  }

  if (statusCode === 429) {
    return {
      title: "上游限流或额度耗尽 (HTTP 429)",
      description: "上游 Provider 返回了 Rate Limit。可能触发了 RPM/TPM 频次上限或账户额度耗尽。",
      tone: "danger",
      actionText: "查看连接与凭据",
      actionLink: "/connections",
      actionConnectionId: failedAttempt?.connectionId,
    };
  }

  if (statusCode === 404) {
    return {
      title: "上游模型不存在 (HTTP 404)",
      description: `请求的模型 ID “${requestedModel}”（映射为上游 “${upstreamModel}”）未被 Endpoint 识别。请检查上游支持的真实模型名称。`,
      tone: "danger",
      actionText: "检查模型绑定",
      actionLink: "/models",
    };
  }

  if (statusCode !== null && statusCode !== undefined && statusCode >= 500) {
    return {
      title: `上游服务故障 (HTTP ${statusCode})`,
      description: "上游厂商服务端发生内部错误或返回了 5xx 响应。请检查上游状态并按当前路由策略决定是否重试。",
      tone: "danger",
      actionText: "检查连接状态",
      actionLink: "/connections",
      actionConnectionId: failedAttempt?.connectionId,
    };
  }

  return {
    title: "连接或上游请求失败",
    description: "未收到可用于进一步分类的 HTTP 状态。请检查该 Attempt 的错误信息，并执行最小连通性测试。",
    tone: "danger",
    actionText: "检查连接并测试",
    actionLink: "/connections",
    actionConnectionId: failedAttempt?.connectionId,
  };
}
