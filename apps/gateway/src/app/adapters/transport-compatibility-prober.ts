import type {
  CompatibilityFactObservation,
  CompatibilityProbeCheck,
  CompatibilityProbeCheckResult,
  CompatibilityProber,
  ConnectionProtocol,
  CredentialProbeClassification,
  EndpointRecord,
} from "../../control-plane/features/connections/contracts.js";
import type { TransportRegistry, UpstreamResponse } from "../../data-plane/transport/contracts.js";

import { Buffer } from "node:buffer";

import {
  createProbeBody,
  extractTextOutput,
  featureKeyForCheck,
  hasBasicResponseShape,
  hasReasoningEvidence,
  hasToolCall,
  objectValue,
  parseJson,
  streamHasSemanticEvent,
  streamHasTerminal,
} from "./transport-compatibility-protocol.js";
import { classifyProbeStatus, resolveProbeTarget } from "./transport-probe.js";

const MAX_PROBE_RESPONSE_BYTES = 256 * 1024;

export class TransportCompatibilityProber implements CompatibilityProber {
  public constructor(
    private readonly transportRegistry: TransportRegistry,
    private readonly timeoutMs: number,
  ) {}

  public async probeCheck(input: Parameters<CompatibilityProber["probeCheck"]>[0]): Promise<CompatibilityProbeCheckResult> {
    const featureKey = featureKeyForCheck(input.check, input.endpoint.protocol);
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    const signal = AbortSignal.any([input.signal, timeoutSignal]);
    try {
      const response = await this.transportRegistry.request({
        ...resolveProbeTarget(input.endpoint),
        method: "POST",
        headers: createHeaders(input.endpoint, input.secret),
        body: Buffer.from(JSON.stringify(createProbeBody(input.endpoint.protocol, input.check, input.model))),
        signal,
      });
      const body = await readBoundedBody(response);
      return evaluateResponse(input.check, input.endpoint.protocol, response, body, featureKey);
    } catch {
      if (input.signal.aborted)
        throw new DOMException("Compatibility probe aborted", "AbortError");
      return {
        check: input.check,
        facts: [{
          featureKey,
          supportLevel: "unknown",
          notes: timeoutSignal.aborted ? "上游响应在测试超时前未完成。" : "未收到可判定的上游响应。",
        }],
      };
    }
  }
}

function evaluateResponse(
  check: CompatibilityProbeCheck,
  protocol: ConnectionProtocol,
  response: UpstreamResponse,
  body: string,
  featureKey: string,
): CompatibilityProbeCheckResult {
  if (check === "error_shape")
    return evaluateErrorEnvelope(protocol, response.statusCode, body, featureKey);

  const classification = classifyProbeStatus(response.statusCode);
  if (check === "basic")
    return evaluateBasic(protocol, classification, response.statusCode, body);
  if (classification !== "healthy") {
    return {
      check,
      facts: [{
        featureKey,
        supportLevel: classification === "upstream_rejected" ? "unsupported" : "degraded",
        notes: `上游返回 HTTP ${response.statusCode}，本项未通过。`,
      }],
    };
  }

  if (check === "unknown_field") {
    return completed(check, featureKey, "ignored", "未知测试字段未阻断请求；无法据此证明上游消费了该字段。");
  }
  if (check === "stream")
    return evaluateStream(protocol, response, body, featureKey);
  if (check === "usage")
    return evaluateUsage(body, featureKey);
  if (check === "tools")
    return evaluateTools(protocol, body, featureKey);
  if (check === "reasoning")
    return evaluateReasoning(protocol, body, featureKey);
  if (check === "structured_output")
    return evaluateStructuredOutput(protocol, body, featureKey);
  return evaluateHarness(protocol, response, body, featureKey);
}

function evaluateBasic(
  protocol: ConnectionProtocol,
  classification: CredentialProbeClassification,
  statusCode: number,
  body: string,
): CompatibilityProbeCheckResult {
  if (classification !== "healthy") {
    const authFailed = classification === "auth_failed";
    return {
      check: "basic",
      credentialResult: { classification, statusCode },
      stopRemainingChecks: authFailed,
      facts: [
        {
          featureKey: "auth.valid",
          supportLevel: authFailed ? "unsupported" : "unknown",
          notes: authFailed ? `上游返回 HTTP ${statusCode}，Credential 鉴权失败。` : `上游返回 HTTP ${statusCode}，无法确认鉴权。`,
        },
        {
          featureKey: "request.basic",
          supportLevel: classification === "upstream_rejected" ? "unsupported" : "degraded",
          notes: `最小请求返回 HTTP ${statusCode}。`,
        },
      ],
    };
  }
  const parsed = parseJson(body);
  const shapeSupported = hasBasicResponseShape(protocol, parsed);
  return {
    check: "basic",
    credentialResult: { classification, statusCode },
    facts: [
      { featureKey: "auth.valid", supportLevel: "supported", notes: `Credential 通过鉴权并收到 HTTP ${statusCode}。` },
      {
        featureKey: "request.basic",
        supportLevel: shapeSupported ? "supported" : "degraded",
        notes: shapeSupported ? "最小非流式请求返回了协议预期结构。" : "请求成功，但响应缺少协议预期结构。",
      },
    ],
  };
}

function evaluateStream(
  protocol: ConnectionProtocol,
  response: UpstreamResponse,
  body: string,
  featureKey: string,
): CompatibilityProbeCheckResult {
  const contentType = headerValue(response.headers, "content-type");
  const isSse = contentType.toLowerCase().includes("text/event-stream");
  const hasEvent = streamHasSemanticEvent(protocol, body);
  const hasTerminal = streamHasTerminal(protocol, body);
  if (isSse && hasEvent && hasTerminal)
    return completed("stream", featureKey, "supported", "SSE 包含语义事件和协议终态。");
  if (isSse && hasEvent)
    return completed("stream", featureKey, "partial", "SSE 包含语义事件，但未观察到协议终态。");
  return completed("stream", featureKey, "degraded", "响应未形成可验证的协议 SSE 事件流。");
}

function evaluateUsage(body: string, featureKey: string): CompatibilityProbeCheckResult {
  const parsed = parseJson(body);
  const usage = objectValue(parsed, "usage");
  const hasCounts = usage !== null && Object.values(usage).some(value => typeof value === "number");
  return completed(
    "usage",
    featureKey,
    hasCounts ? "supported" : "unsupported",
    hasCounts ? "响应包含数值 Usage 字段。" : "成功响应未包含可识别的 Usage 数值。",
  );
}

function evaluateTools(protocol: ConnectionProtocol, body: string, featureKey: string): CompatibilityProbeCheckResult {
  const supported = hasToolCall(protocol, parseJson(body), "aigw_probe");
  return completed(
    "tools",
    featureKey,
    supported ? "supported" : "partial",
    supported ? "响应返回了强制指定的 Function Tool Call。" : "请求成功，但未观察到指定的 Function Tool Call。",
  );
}

function evaluateReasoning(protocol: ConnectionProtocol, body: string, featureKey: string): CompatibilityProbeCheckResult {
  const supported = hasReasoningEvidence(protocol, parseJson(body));
  return completed(
    "reasoning",
    featureKey,
    supported ? "supported" : "partial",
    supported ? "响应包含可识别的 Reasoning 证据。" : "Reasoning 参数被接受，但响应未提供可验证证据。",
  );
}

function evaluateStructuredOutput(protocol: ConnectionProtocol, body: string, featureKey: string): CompatibilityProbeCheckResult {
  const output = extractTextOutput(protocol, parseJson(body));
  const structured = parseJson(output);
  const supported = structured?.ok === true;
  return completed(
    "structured_output",
    featureKey,
    supported ? "supported" : "partial",
    supported ? "响应符合请求的 JSON Schema。" : "结构化输出参数被接受，但响应未符合测试 Schema。",
  );
}

function evaluateErrorEnvelope(
  protocol: ConnectionProtocol,
  statusCode: number,
  body: string,
  featureKey: string,
): CompatibilityProbeCheckResult {
  if (statusCode >= 200 && statusCode < 300)
    return completed("error_shape", featureKey, "unsupported", "缺少必填模型的无效请求仍返回成功状态。");
  const parsed = parseJson(body);
  const supported = protocol === "anthropic-messages"
    ? parsed?.type === "error" && objectValue(parsed, "error") !== null
    : objectValue(parsed, "error") !== null;
  return completed(
    "error_shape",
    featureKey,
    supported ? "supported" : "degraded",
    supported ? `HTTP ${statusCode} 使用了协议预期错误 Envelope。` : `HTTP ${statusCode} 未使用可识别的协议错误 Envelope。`,
  );
}

function evaluateHarness(
  protocol: ConnectionProtocol,
  response: UpstreamResponse,
  body: string,
  featureKey: string,
): CompatibilityProbeCheckResult {
  let supported = false;
  let supportedNote = "";
  if (protocol === "openai-chat") {
    supported = headerValue(response.headers, "content-type").includes("text/event-stream") && body.includes("\"usage\"");
    supportedNote = "流式响应包含 include_usage 结果。";
  } else if (protocol === "openai-responses") {
    supported = body.includes("apply_patch") && (body.includes("response.completed") || body.includes("[DONE]"));
    supportedNote = "Responses SSE 返回 apply_patch Function Tool 与终态。";
  } else {
    supported = hasToolCall(protocol, parseJson(body), "apply_patch");
    supportedNote = "Anthropic Message 返回 apply_patch Tool Use。";
  }
  return completed(
    "harness",
    featureKey,
    supported ? "supported" : "partial",
    supported ? supportedNote : "请求成功，但未观察到 Harness 组合能力的完整证据。",
  );
}

function completed(
  check: CompatibilityProbeCheck,
  featureKey: string,
  supportLevel: CompatibilityFactObservation["supportLevel"],
  notes: string,
): CompatibilityProbeCheckResult {
  return { check, facts: [{ featureKey, supportLevel, notes }] };
}

function createHeaders(endpoint: EndpointRecord, secret: string): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  headers[endpoint.authScheme === "x-api-key" ? "x-api-key" : "authorization"]
    = endpoint.authScheme === "x-api-key" ? secret : `Bearer ${secret}`;
  if (endpoint.protocol === "anthropic-messages")
    headers["anthropic-version"] = "2023-06-01";
  return headers;
}

async function readBoundedBody(response: UpstreamResponse): Promise<string> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of response.body) {
    totalBytes += chunk.byteLength;
    if (totalBytes > MAX_PROBE_RESPONSE_BYTES)
      throw new Error("Compatibility probe response exceeded its byte limit.");
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function headerValue(headers: UpstreamResponse["headers"], name: string): string {
  const value = headers[name];
  return typeof value === "string" ? value : value?.join(", ") ?? "";
}
