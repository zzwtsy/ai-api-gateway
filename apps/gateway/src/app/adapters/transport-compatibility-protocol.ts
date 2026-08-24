import type {
  CompatibilityProbeCheck,
  ConnectionProtocol,
} from "../../control-plane/features/connections/contracts.js";

export function createProbeBody(
  protocol: ConnectionProtocol,
  check: CompatibilityProbeCheck,
  model: string,
): Record<string, unknown> {
  const body = baseBody(protocol, model);
  if (check === "stream")
    body.stream = true;
  if (check === "unknown_field")
    body.aigw_probe_unknown_field = { preserved: true };
  if (check === "tools")
    addTool(body, protocol, "aigw_probe");
  if (check === "reasoning")
    addReasoning(body, protocol);
  if (check === "structured_output")
    addStructuredOutput(body, protocol);
  if (check === "error_shape")
    delete body.model;
  if (check === "harness")
    addHarnessProbe(body, protocol);
  return body;
}

export function hasBasicResponseShape(
  protocol: ConnectionProtocol,
  parsed: Record<string, unknown> | null,
): boolean {
  if (parsed === null)
    return false;
  if (protocol === "openai-chat")
    return Array.isArray(parsed.choices);
  if (protocol === "openai-responses")
    return typeof parsed.id === "string" && (Array.isArray(parsed.output) || typeof parsed.output_text === "string");
  return parsed.type === "message" && Array.isArray(parsed.content);
}

export function hasToolCall(
  protocol: ConnectionProtocol,
  parsed: Record<string, unknown> | null,
  name: string,
): boolean {
  if (parsed === null)
    return false;
  if (protocol === "openai-chat")
    return JSON.stringify(parsed.choices ?? []).includes(`\"name\":\"${name}\"`);
  if (protocol === "openai-responses")
    return JSON.stringify(parsed.output ?? []).includes(name);
  return JSON.stringify(parsed.content ?? []).includes(`\"name\":\"${name}\"`);
}

export function hasReasoningEvidence(
  protocol: ConnectionProtocol,
  parsed: Record<string, unknown> | null,
): boolean {
  if (parsed === null)
    return false;
  const serialized = JSON.stringify(parsed);
  if (protocol === "openai-chat")
    return serialized.includes("reasoning_tokens") || serialized.includes("reasoning_content");
  if (protocol === "openai-responses")
    return serialized.includes("\"type\":\"reasoning\"") || serialized.includes("reasoning_tokens");
  return serialized.includes("\"type\":\"thinking\"");
}

export function extractTextOutput(
  protocol: ConnectionProtocol,
  parsed: Record<string, unknown> | null,
): string {
  if (parsed === null)
    return "";
  if (protocol === "openai-chat") {
    const choices = Array.isArray(parsed.choices) ? parsed.choices : [];
    return nestedString(choices[0], ["message", "content"]);
  }
  if (protocol === "openai-responses") {
    if (typeof parsed.output_text === "string")
      return parsed.output_text;
    return nestedString(Array.isArray(parsed.output) ? parsed.output[0] : null, ["content", "0", "text"]);
  }
  return nestedString(Array.isArray(parsed.content) ? parsed.content[0] : null, ["text"]);
}

export function streamHasSemanticEvent(protocol: ConnectionProtocol, body: string): boolean {
  if (protocol === "openai-chat")
    return body.includes("choices");
  if (protocol === "openai-responses")
    return body.includes("response.output_text.delta") || body.includes("response.output_item");
  return body.includes("content_block_delta") || body.includes("content_block_start");
}

export function streamHasTerminal(protocol: ConnectionProtocol, body: string): boolean {
  if (protocol === "openai-chat")
    return body.includes("[DONE]");
  if (protocol === "openai-responses")
    return body.includes("response.completed") || body.includes("[DONE]");
  return body.includes("message_stop");
}

export function featureKeyForCheck(
  check: CompatibilityProbeCheck,
  protocol: ConnectionProtocol,
): string {
  if (check === "basic")
    return "request.basic";
  if (check === "stream")
    return "stream.sse";
  if (check === "usage")
    return "usage.reported";
  if (check === "unknown_field")
    return "fields.unknown";
  if (check === "tools")
    return "tools.function_call";
  if (check === "reasoning")
    return "reasoning.output";
  if (check === "structured_output")
    return "output.structured";
  if (check === "error_shape")
    return "error.envelope";
  return {
    "openai-chat": "harness.openai_chat.stream_usage",
    "openai-responses": "harness.codex.apply_patch",
    "anthropic-messages": "harness.claude_code.tool_use",
  }[protocol];
}

export function parseJson(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export function objectValue(
  value: Record<string, unknown> | null,
  key: string,
): Record<string, unknown> | null {
  if (value === null)
    return null;
  const child = value[key];
  return typeof child === "object" && child !== null && !Array.isArray(child)
    ? child as Record<string, unknown>
    : null;
}

function baseBody(protocol: ConnectionProtocol, model: string): Record<string, unknown> {
  if (protocol === "openai-responses") {
    return { model, input: "Return OK.", max_output_tokens: 16, stream: false };
  }
  if (protocol === "anthropic-messages") {
    return { model, messages: [{ role: "user", content: "Return OK." }], max_tokens: 16, stream: false };
  }
  return { model, messages: [{ role: "user", content: "Return OK." }], max_tokens: 16, stream: false };
}

function addTool(body: Record<string, unknown>, protocol: ConnectionProtocol, name: string): void {
  const parameters = {
    type: "object",
    properties: { ok: { type: "boolean" } },
    required: ["ok"],
    additionalProperties: false,
  };
  if (protocol === "openai-chat") {
    body.tools = [{ type: "function", function: { name, description: "Return a probe result", parameters } }];
    body.tool_choice = { type: "function", function: { name } };
  } else if (protocol === "openai-responses") {
    body.tools = [{ type: "function", name, description: "Return a probe result", parameters, strict: true }];
    body.tool_choice = { type: "function", name };
  } else {
    body.tools = [{ name, description: "Return a probe result", input_schema: parameters }];
    body.tool_choice = { type: "tool", name };
  }
}

function addReasoning(body: Record<string, unknown>, protocol: ConnectionProtocol): void {
  if (protocol === "openai-chat") {
    body.reasoning_effort = "low";
  } else if (protocol === "openai-responses") {
    body.reasoning = { effort: "low", summary: "auto" };
  } else {
    body.thinking = { type: "enabled", budget_tokens: 1024 };
    body.max_tokens = 1025;
  }
}

function addStructuredOutput(body: Record<string, unknown>, protocol: ConnectionProtocol): void {
  const schema = {
    type: "object",
    properties: { ok: { type: "boolean" } },
    required: ["ok"],
    additionalProperties: false,
  };
  if (protocol === "openai-chat") {
    body.response_format = { type: "json_schema", json_schema: { name: "aigw_probe", strict: true, schema } };
  } else if (protocol === "openai-responses") {
    body.text = { format: { type: "json_schema", name: "aigw_probe", strict: true, schema } };
  } else {
    body.output_format = { type: "json_schema", schema };
  }
}

function addHarnessProbe(body: Record<string, unknown>, protocol: ConnectionProtocol): void {
  if (protocol === "openai-chat") {
    body.stream = true;
    body.stream_options = { include_usage: true };
    return;
  }
  addTool(body, protocol, "apply_patch");
  if (protocol === "openai-responses")
    body.stream = true;
}

function nestedString(value: unknown, path: readonly string[]): string {
  let current = value;
  for (const segment of path) {
    if (typeof current !== "object" || current === null)
      return "";
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" ? current : "";
}
