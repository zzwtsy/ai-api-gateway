export interface OpenAiChatRequestInfo {
  readonly requestedModel: string;
  readonly stream: boolean;
}

export function readOpenAiChatRequest(body: Uint8Array): OpenAiChatRequestInfo {
  const value: unknown = JSON.parse(new TextDecoder().decode(body));
  if (!isRecord(value)) {
    throw new TypeError("Request body must be a JSON object");
  }
  const model = value.model;
  if (typeof model !== "string" || model.length === 0) {
    throw new TypeError("model must be a non-empty string");
  }
  const stream = value.stream;
  if (stream !== undefined && typeof stream !== "boolean") {
    throw new TypeError("stream must be a boolean when provided");
  }
  return {
    requestedModel: model,
    stream: stream ?? false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
