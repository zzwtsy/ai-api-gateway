export interface HarnessSnippet {
  readonly id: string;
  readonly title: string;
  readonly language: string;
  readonly code: string;
  readonly description: string;
}

export const GATEWAY_CLIENT_KEY_PLACEHOLDER = "YOUR_GATEWAY_CLIENT_KEY";

export function generateHarnessSnippets(options: {
  readonly apiKey?: string | undefined;
  readonly origin?: string | undefined;
  readonly protocol?: "openai-chat" | "openai-responses" | "anthropic-messages" | undefined;
}): readonly HarnessSnippet[] {
  const origin = options.origin ?? (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:3001");
  const apiKey = options.apiKey ?? GATEWAY_CLIENT_KEY_PLACEHOLDER;
  const protocol = options.protocol ?? "openai-chat";

  const cursorSnippet: HarnessSnippet = {
    id: "cursor",
    title: "Cursor",
    language: "bash",
    code: `Base URL: ${origin}/openai/v1\nAPI Key:  ${apiKey}`,
    description: "在 Cursor 设置 > Models > OpenAI API Key 中填入以上地址与密钥。",
  };

  const codexSnippet: HarnessSnippet = {
    id: "codex",
    title: "Codex CLI",
    language: "toml",
    code: `# ~/.codex/config.toml
[model_providers.gateway]
base_url = "${origin}/openai/v1"
api_key = "${apiKey}"`,
    description: "写入 ~/.codex/config.toml 即可将 Codex 请求接入网关。",
  };

  const claudeSnippet: HarnessSnippet = {
    id: "claude",
    title: "Claude Code",
    language: "bash",
    code: `export ANTHROPIC_BASE_URL="${origin}/anthropic"
export ANTHROPIC_AUTH_TOKEN="${apiKey}"`,
    description: "在终端中运行以将 Claude Code CLI 指向网关。",
  };

  const curl = curlConfiguration(protocol, origin, apiKey);

  const curlSnippet: HarnessSnippet = {
    id: "curl",
    title: "cURL 验证",
    language: "bash",
    code: `curl -X POST ${curl.endpoint} \\\n  ${curl.authHeader} \\\n  -H "Content-Type: application/json" \\\n  -d '${curl.body}'`,
    description: "在终端中发送一次最小真实请求以验证网关路由与密钥连通性。",
  };

  return {
    "openai-chat": [cursorSnippet, curlSnippet],
    "openai-responses": [codexSnippet, curlSnippet],
    "anthropic-messages": [claudeSnippet, curlSnippet],
  }[protocol];
}

function curlConfiguration(
  protocol: "openai-chat" | "openai-responses" | "anthropic-messages",
  origin: string,
  apiKey: string,
): { readonly authHeader: string; readonly body: string; readonly endpoint: string } {
  if (protocol === "anthropic-messages") {
    return {
      authHeader: `-H "x-api-key: ${apiKey}" \\\n  -H "anthropic-version: 2023-06-01"`,
      body: JSON.stringify({ model: "claude-3-7-sonnet-20250219", max_tokens: 100, messages: [{ role: "user", content: "ping" }] }, null, 2),
      endpoint: `${origin}/anthropic/v1/messages`,
    };
  }
  if (protocol === "openai-responses") {
    return {
      authHeader: `-H "Authorization: Bearer ${apiKey}"`,
      body: JSON.stringify({ model: "gpt-5", input: "ping" }, null, 2),
      endpoint: `${origin}/openai/v1/responses`,
    };
  }
  return {
    authHeader: `-H "Authorization: Bearer ${apiKey}"`,
    body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: "ping" }] }, null, 2),
    endpoint: `${origin}/openai/v1/chat/completions`,
  };
}
