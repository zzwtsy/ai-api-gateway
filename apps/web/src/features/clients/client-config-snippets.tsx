import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { generateHarnessSnippets } from "./harness-snippets";

export function ClientConfigSnippets({
  apiKey,
  protocol,
}: {
  readonly apiKey?: string | undefined;
  readonly protocol?: "openai-chat" | "openai-responses" | "anthropic-messages" | undefined;
}) {
  const snippets = generateHarnessSnippets({ apiKey, protocol });
  const [activeSnippetId, setActiveSnippetId] = useState<string>(snippets[0]?.id ?? "cursor");
  const [copyResult, setCopyResult] = useState<{ readonly id: string; readonly status: "copied" | "failed" } | null>(null);

  const activeSnippet = snippets.find(snippet => snippet.id === activeSnippetId) ?? snippets[0];

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyResult({ id, status: "copied" });
    } catch {
      setCopyResult({ id, status: "failed" });
    }
  };

  if (activeSnippet === undefined)
    return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {apiKey === undefined ? "配置模板" : "接入配置"}
        </span>
        <div className="flex flex-wrap gap-1">
          {snippets.map(snippet => (
            <Button
              key={snippet.id}
              type="button"
              size="xs"
              variant={activeSnippetId === snippet.id ? "secondary" : "ghost"}
              onClick={() => setActiveSnippetId(snippet.id)}
            >
              {snippet.title}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{activeSnippet.description}</p>

      <div className="relative rounded-md border bg-muted/50 p-3">
        <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap">
          {activeSnippet.code}
        </pre>
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => void handleCopy(activeSnippet.id, activeSnippet.code)}
          >
            {copyResult?.id === activeSnippet.id && copyResult.status === "copied" ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
            {copyResult?.id === activeSnippet.id && copyResult.status === "copied" ? "已复制" : "复制配置"}
          </Button>
        </div>
      </div>
      {copyResult?.id === activeSnippet.id && copyResult.status === "failed" && (
        <p role="alert" className="text-xs text-destructive">
          浏览器拒绝访问剪贴板，请手动复制配置。
        </p>
      )}
    </div>
  );
}
