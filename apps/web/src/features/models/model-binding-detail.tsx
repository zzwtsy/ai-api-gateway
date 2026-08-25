import type { ReactNode } from "react";
import type { components } from "@/api/schema";

import { StatusBadge } from "@/components/product/status-badge";
import { Badge } from "@/components/ui/badge";

type ModelBinding = components["schemas"]["ProviderModelBinding"];

export function ModelBindingDetail({ binding, endpointName }: {
  readonly binding: ModelBinding;
  readonly endpointName: string;
}) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <section aria-labelledby="model-binding-facts" className="flex flex-col gap-3">
        <h3 id="model-binding-facts" className="font-heading text-sm font-medium">绑定信息</h3>
        <dl className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
          <ModelFact label="状态">
            <StatusBadge tone={modelStatusTone(binding.status)}>{modelStatusLabel(binding.status)}</StatusBadge>
          </ModelFact>
          <ModelFact label="Provider / Endpoint">{endpointName}</ModelFact>
          <ModelFact label="上游模型 ID"><code className="text-xs">{binding.upstreamModelId}</code></ModelFact>
          <ModelFact label="绑定 ID"><code className="break-all text-xs">{binding.id}</code></ModelFact>
          <ModelFact label="创建时间">{formatDateTime(binding.createdAt)}</ModelFact>
          <ModelFact label="更新时间">{formatDateTime(binding.updatedAt)}</ModelFact>
        </dl>
      </section>

      <section aria-labelledby="model-binding-metadata" className="flex flex-col gap-3">
        <h3 id="model-binding-metadata" className="font-heading text-sm font-medium">能力与价格</h3>
        <div className="rounded-lg border p-4">
          <Badge variant="secondary">未知</Badge>
          <p className="mt-2 text-sm text-muted-foreground">
            当前绑定没有已验证的能力、上下文窗口或价格数据；未知不等于不支持或数值为 0。
          </p>
        </div>
      </section>
    </div>
  );
}

function ModelFact({ children, label }: { readonly children: ReactNode; readonly label: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function modelStatusLabel(status: ModelBinding["status"]): string {
  return { unverified: "未验证", available: "可用", deprecated: "已弃用", unavailable: "不可用" }[status];
}

function modelStatusTone(status: ModelBinding["status"]): "success" | "warning" | "danger" | "neutral" {
  if (status === "available")
    return "success";
  if (status === "unverified")
    return "warning";
  if (status === "unavailable")
    return "danger";
  return "neutral";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
