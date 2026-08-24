export type ConnectionProtocol = "openai-chat" | "openai-responses" | "anthropic-messages";

export const connectionProtocolItems = [
  { value: "openai-chat", label: "OpenAI Chat Completions" },
  { value: "openai-responses", label: "OpenAI Responses" },
  { value: "anthropic-messages", label: "Anthropic Messages" },
] as const;

export const connectionProtocolDefaultPaths = {
  "openai-chat": "/v1/chat/completions",
  "openai-responses": "/v1/responses",
  "anthropic-messages": "/v1/messages",
} satisfies Record<ConnectionProtocol, string>;

export function connectionProtocolLabel(protocol: ConnectionProtocol): string {
  return connectionProtocolItems.find(item => item.value === protocol)?.label ?? protocol;
}
