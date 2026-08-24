import type { components } from "@/api/schema";

type RequestRecord = components["schemas"]["GatewayRequest"];
type RequestDetailRecord = components["schemas"]["GatewayRequestDetail"];
type AttemptRecord = components["schemas"]["GatewayAttempt"];
type StatusTone = "success" | "warning" | "danger" | "neutral";

interface RequestListItemView {
  readonly id: string;
  readonly outcome: RequestRecord["outcome"];
  readonly requestedModel: string;
  readonly startedAtLabel: string;
  readonly ttftLabel: string;
}

interface RequestDetailView {
  readonly attempts: readonly AttemptView[];
  readonly facts: readonly FactView[];
  readonly id: string;
  readonly observation: ObservationView;
  readonly outcome: RequestRecord["outcome"];
  readonly partial: boolean;
}

interface AttemptView {
  readonly connectionId: string;
  readonly credentialId: string;
  readonly id: string;
  readonly outcomeLabel: string;
  readonly sequence: number;
  readonly statusCodeLabel: string;
  readonly tone: StatusTone;
}

interface FactView {
  readonly label: string;
  readonly value: string;
}

interface ObservationView {
  readonly bytesLabel: string;
  readonly label: string;
  readonly status: RequestRecord["observationStatus"];
  readonly tone: StatusTone;
}

export function toRequestListItemView(item: RequestRecord): RequestListItemView {
  return {
    id: item.id,
    outcome: item.outcome,
    requestedModel: item.requestedModel,
    startedAtLabel: formatTime(item.startedAt),
    ttftLabel: formatMilliseconds(item.ttftMs),
  };
}

export function toRequestDetailView(item: RequestDetailRecord): RequestDetailView {
  const observation = toObservationView(item);
  return {
    id: item.id,
    outcome: item.outcome,
    facts: [
      { label: "请求模型", value: item.requestedModel },
      { label: "上游模型", value: item.upstreamModel },
      { label: "协议", value: item.protocol },
      { label: "路由快照", value: `v${item.routingSnapshotVersion}` },
      { label: "总延迟", value: formatMilliseconds(item.latencyMs) },
      { label: "TTFT", value: formatMilliseconds(item.ttftMs) },
    ],
    attempts: item.attempts.map(toAttemptView),
    observation,
    partial: observation.status !== "complete",
  };
}

function toAttemptView(item: AttemptRecord): AttemptView {
  const presentation = attemptPresentation(item.outcome);
  return {
    id: item.id,
    sequence: item.sequence,
    connectionId: item.connectionId,
    credentialId: item.credentialId,
    statusCodeLabel: item.statusCode === null ? "—" : String(item.statusCode),
    ...presentation,
  };
}

function attemptPresentation(outcome: AttemptRecord["outcome"]): Pick<AttemptView, "outcomeLabel" | "tone"> {
  switch (outcome) {
    case "running": return { outcomeLabel: "进行中", tone: "neutral" };
    case "succeeded": return { outcomeLabel: "成功", tone: "success" };
    case "failed": return { outcomeLabel: "失败", tone: "danger" };
    case "client_cancelled": return { outcomeLabel: "客户端已取消", tone: "warning" };
  }
}

function toObservationView(item: RequestRecord): ObservationView {
  const bytesLabel = new Intl.NumberFormat("zh-CN").format(item.observedBytes);
  switch (item.observationStatus) {
    case "pending": return { status: "pending", label: "等待完成", tone: "warning", bytesLabel };
    case "complete": return { status: "complete", label: "完整", tone: "success", bytesLabel };
    case "incomplete": return { status: "incomplete", label: "不完整", tone: "warning", bytesLabel };
  }
}

function formatMilliseconds(value: number | null): string {
  return value === null ? "—" : `${value} ms`;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}
