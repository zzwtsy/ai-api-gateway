export interface ProviderPreset {
  readonly slug: string;
  readonly name: string;
  readonly protocol: "openai-chat" | "openai-responses" | "anthropic-messages";
  readonly baseUrl: string;
  readonly requestPath: string;
}

export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  {
    slug: "deepseek",
    name: "DeepSeek",
    protocol: "openai-chat",
    baseUrl: "https://api.deepseek.com",
    requestPath: "/chat/completions",
  },
  {
    slug: "openai",
    name: "OpenAI",
    protocol: "openai-chat",
    baseUrl: "https://api.openai.com",
    requestPath: "/v1/chat/completions",
  },
  {
    slug: "anthropic",
    name: "Anthropic",
    protocol: "anthropic-messages",
    baseUrl: "https://api.anthropic.com",
    requestPath: "/v1/messages",
  },
  {
    slug: "openrouter",
    name: "OpenRouter",
    protocol: "openai-chat",
    baseUrl: "https://openrouter.ai/api",
    requestPath: "/v1/chat/completions",
  },
  {
    slug: "siliconflow",
    name: "SiliconFlow (硅基流动)",
    protocol: "openai-chat",
    baseUrl: "https://api.siliconflow.cn",
    requestPath: "/v1/chat/completions",
  },
  {
    slug: "moonshot",
    name: "Moonshot (月之暗面 / Kimi)",
    protocol: "openai-chat",
    baseUrl: "https://api.moonshot.cn",
    requestPath: "/v1/chat/completions",
  },
  {
    slug: "zhipu",
    name: "智谱 AI (GLM)",
    protocol: "openai-chat",
    baseUrl: "https://open.bigmodel.cn/api/paas",
    requestPath: "/v4/chat/completions",
  },
] as const;

export function findPresetBySlug(slug: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find(preset => preset.slug === slug);
}
