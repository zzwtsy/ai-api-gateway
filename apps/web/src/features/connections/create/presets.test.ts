import { describe, expect, it } from "vitest";
import { findPresetBySlug, PROVIDER_PRESETS } from "./presets";

describe("provider presets", () => {
  it("contains standard major providers", () => {
    const slugs = PROVIDER_PRESETS.map(preset => preset.slug);
    expect(slugs).toContain("deepseek");
    expect(slugs).toContain("openai");
    expect(slugs).toContain("anthropic");
    expect(slugs).toContain("openrouter");
  });

  it("finds preset by slug", () => {
    const deepseek = findPresetBySlug("deepseek");
    expect(deepseek).toBeDefined();
    expect(deepseek?.baseUrl).toBe("https://api.deepseek.com");
    expect(deepseek?.protocol).toBe("openai-chat");
    expect(deepseek?.requestPath).toBe("/chat/completions");
  });

  it("returns undefined for unknown slug", () => {
    expect(findPresetBySlug("unknown-provider")).toBeUndefined();
  });
});
