import { Link } from "@tanstack/react-router";
import { MousePointerClickIcon, SendIcon } from "lucide-react";

import { DataErrorState } from "@/components/product/data-error-state";
import { PageHeader } from "@/components/product/page-header";
import { RequestStatus } from "@/components/product/request-status";
import { StatusBadge } from "@/components/product/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { describeApiError } from "@/lib/api-runtime/client";
import { cn } from "@/lib/utils";

import { useRequest, useRequests } from "./hooks";
import { toRequestDetailView, toRequestListItemView } from "./request-view-model";

export function RequestsPage({ requestId }: { readonly requestId: string | undefined }) {
  const requests = useRequests();
  const detail = useRequest(requestId);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="请求"
        description="从一次逻辑请求解释路由快照、上游尝试和最终结果。"
      />
      <div
        data-slot="request-workbench"
        className="grid min-h-[610px] overflow-hidden rounded-xl border aigw-desktop:grid-cols-[minmax(var(--aigw-layout-request-master-min),1.3fr)_minmax(var(--aigw-layout-request-inspector-min),0.7fr)]"
      >
        <section
          data-slot="request-master"
          aria-labelledby="request-list-title"
          className="min-w-0 border-b aigw-desktop:border-r aigw-desktop:border-b-0"
        >
          <div className="flex h-14 items-center justify-between border-b px-5">
            <div>
              <div id="request-list-title" className="text-sm font-semibold">逻辑请求</div>
              <div className="text-xs text-muted-foreground">最近 50 条</div>
            </div>
            <Badge variant="secondary">{requests.data?.length ?? "—"}</Badge>
          </div>
          <RequestList
            error={requests.isError ? requests.error : null}
            items={requests.data}
            loading={requests.isPending}
            onRetry={requests.refetch}
            selectedRequestId={requestId}
            stale={requests.isRefetchError && requests.data !== undefined}
          />
        </section>
        <section data-slot="request-inspector" aria-label="请求详情" className="min-w-0">
          <RequestInspector
            error={detail.isError ? detail.error : null}
            requestId={requestId}
            loading={detail.isPending}
            onRetry={detail.refetch}
            stale={detail.isRefetchError && detail.data !== undefined}
            data={detail.data}
          />
        </section>
      </div>
    </div>
  );
}

function RequestList({
  error,
  loading,
  items,
  onRetry,
  selectedRequestId,
  stale,
}: {
  readonly error: unknown;
  readonly loading: boolean;
  readonly items: ReturnType<typeof useRequests>["data"];
  readonly onRetry: () => Promise<unknown>;
  readonly selectedRequestId: string | undefined;
  readonly stale: boolean;
}) {
  if (items === undefined && error !== null) {
    return (
      <div className="p-5">
        <DataErrorState
          title="无法加载逻辑请求"
          description={describeApiError(error, "请求列表暂时不可用。")}
          onRetry={onRetry}
        />
      </div>
    );
  }
  if (loading || items === undefined) {
    return <div className="p-5"><Skeleton className="h-56" /></div>;
  }
  if (items.length === 0) {
    return (
      <Empty className="min-h-[420px] border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon"><SendIcon /></EmptyMedia>
          <EmptyTitle>还没有逻辑请求</EmptyTitle>
          <EmptyDescription>
            使用开发网关客户端密钥发送一次 OpenAI Chat 请求后，这里会出现完整诊断链。
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  const viewItems = items.map(toRequestListItemView);
  return (
    <>
      {stale && (
        <div className="p-3">
          <DataErrorState
            tone="warning"
            title="请求列表可能已过期"
            description={describeApiError(error, "后台刷新失败，当前仍显示上次成功加载的数据。")}
            onRetry={onRetry}
          />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>模型</TableHead>
            <TableHead>结果</TableHead>
            <TableHead>TTFT</TableHead>
            <TableHead>时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {viewItems.map(item => (
            <TableRow
              key={item.id}
              className={cn(selectedRequestId === item.id && "bg-muted/70")}
              aria-selected={selectedRequestId === item.id}
            >
              <TableCell>
                <Link
                  to="/requests"
                  search={{ requestId: item.id }}
                  className="flex max-w-52 flex-col rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="font-medium">{item.requestedModel}</span>
                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                    {item.id}
                  </span>
                </Link>
              </TableCell>
              <TableCell><RequestStatus outcome={item.outcome} /></TableCell>
              <TableCell className="tabular-nums">
                {item.ttftLabel}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.startedAtLabel}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

function RequestInspector({
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
          <EmptyDescription>
            查看最终结果、实际目标和上游尝试。
          </EmptyDescription>
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
            字节。完整 Secret 不会出现在此处。
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
