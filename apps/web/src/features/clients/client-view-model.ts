import type { components } from "@/api/schema";

type GatewayClient = components["schemas"]["GatewayClient"];
type GatewayClientKey = components["schemas"]["GatewayClientKey"];
type ClientProtocol = GatewayClient["allowedProtocols"][number];

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const protocolLabels = {
  "openai-chat": "OpenAI Chat Completions",
  "openai-responses": "OpenAI Responses",
  "anthropic-messages": "Anthropic Messages",
} satisfies Record<ClientProtocol, string>;

export function clientProtocolLabel(protocol: ClientProtocol): string {
  return protocolLabels[protocol];
}

type GatewayClientKeyDisplayStatus = GatewayClientKey["status"] | "expired";

export function gatewayClientKeyDisplayStatus(key: GatewayClientKey, now = Date.now()): GatewayClientKeyDisplayStatus {
  if (key.status === "expiring" && key.expiresAt !== null && new Date(key.expiresAt).getTime() <= now)
    return "expired";
  return key.status;
}

export function gatewayClientKeyStatusLabel(key: GatewayClientKey, now = Date.now()): string {
  return { active: "有效", expiring: "即将过期", expired: "已过期", revoked: "已撤销" }[gatewayClientKeyDisplayStatus(key, now)];
}

export function gatewayClientKeyTone(key: GatewayClientKey, now = Date.now()): "success" | "warning" | "neutral" {
  return { active: "success", expiring: "warning", expired: "neutral", revoked: "neutral" }[gatewayClientKeyDisplayStatus(key, now)] as "success" | "warning" | "neutral";
}

export function gatewayClientStatusLabel(status: GatewayClient["status"]): string {
  return status === "active" ? "启用" : "停用";
}

export function gatewayClientStatusTone(status: GatewayClient["status"]): "success" | "neutral" {
  return status === "active" ? "success" : "neutral";
}

export function maskGatewayClientKey(key: GatewayClientKey): string {
  return `${key.keyPrefix}••••${key.keyLast4}`;
}

export function formatClientDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatClientLastUsedAt(value: string | null): string {
  return value === null ? "从未使用" : formatClientDateTime(value);
}

export function isGatewayClientKeyUsable(key: GatewayClientKey, now = Date.now()): boolean {
  const status = gatewayClientKeyDisplayStatus(key, now);
  return status === "active" || status === "expiring";
}

export function usableGatewayClientKeyCount(client: GatewayClient, now = Date.now()): number {
  return client.keys.filter(key => isGatewayClientKeyUsable(key, now)).length;
}
