import type { useRequest } from "../hooks";

import { MousePointerClickIcon } from "lucide-react";
import { DataErrorState } from "@/components/product/data-error-state";
import { RequestStatus } from "@/components/product/request-status";
import { StatusBadge } from "@/components/product/status-badge";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

import { describeApiError } from "@/lib/api-runtime/client";
import { toRequestDetailView } from "../request-view-model";
import { RequestDiagnosticBanner } from "./request-diagnostic-banner";

export function RequestInspector({
  error,
  requestId,
  loading,
  onRetry,
  stale,
  data,
}: {
  readonly error: unknown;
  readonly requestId: string | undefined;
  readonly loading: boolean;
  readonly onRetry: () => Promise<unknown>;
  readonly stale: boolean;
  readonly data: ReturnType<typeof useRequest>["data"];
}) {
  if (requestId === undefined) {
    return (
      <Empty className="border-0 p-8">
        <EmptyHeader>
          <EmptyMedia variant="icon"><MousePointerClickIcon /></EmptyMedia>
          <EmptyTitle>选择一条请求</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }
  if (data === undefined && error !== null) {
    return (
      <div className="p-5">
        <DataErrorState
          title="无法加载请求详情"
          description={describeApiError(error, "请求详情暂时不可用。")}
          onRetry={onRetry}
        />
      </div>
    );
  }
  if (loading || data === undefined) {
    return <div className="p-5"><Skeleton className="h-64" /></div>;
  }
  const view = toRequestDetailView(data);
  return (
    <div className="flex flex-col" data-state={view.partial ? "partial" : "ready"}>
      <div className="border-b px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">请求详情</div>
          <RequestStatus outcome={view.outcome} />
        </div>
        <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
          {view.id}
        </div>
      </div>
      <div className="flex flex-col gap-6 p-5 text-sm">
        {stale && (
          <DataErrorState
            tone="warning"
            title="请求详情可能已过期"
            description={describeApiError(error, "后台刷新失败，当前仍显示上次成功加载的数据。")}
            onRetry={onRetry}
          />
        )}

        <RequestDiagnosticBanner diagnosis={view.diagnosis} />

        <section className="grid grid-cols-2 gap-x-5 gap-y-4">
          {view.facts.map(fact => <Fact key={fact.label} label={fact.label} value={fact.value} />)}
        </section>
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            上游尝试链
          </h2>
          <div className="flex flex-col gap-2">
            {view.attempts.map(attempt => (
              <div key={attempt.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {`第 ${attempt.sequence} 次尝试`}
                  </span>
                  <StatusBadge tone={attempt.tone}>
                    {attempt.outcomeLabel}
                  </StatusBadge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>连接</span>
                  <span className="truncate text-right text-foreground">
                    {attempt.connectionId}
                  </span>
                  <span>凭据</span>
                  <span className="truncate text-right text-foreground">
                    {attempt.credentialId}
                  </span>
                  <span>HTTP 状态</span>
                  <span className="text-right text-foreground">
                    {attempt.statusCodeLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section
          data-slot="request-observation"
          data-state={view.observation.status}
          className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground"
        >
          <span>观测状态：</span>
          <StatusBadge tone={view.observation.tone}>{view.observation.label}</StatusBadge>
          <span>
            已观测
            {" "}
            {view.observation.bytesLabel}
            {" "}
            字节
          </span>
        </section>
      </div>
    </div>
  );
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}
