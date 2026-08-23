import { Link } from "@tanstack/react-router";
import { MousePointerClickIcon, SendIcon } from "lucide-react";

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
import { cn } from "@/lib/utils";

import { useRequest, useRequests } from "./hooks";

export function RequestsPage({ requestId }: { readonly requestId: string | undefined }) {
  const requests = useRequests();
  const items = requests.data ?? [];
  const detail = useRequest(requestId);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="请求"
        description="从一次逻辑请求解释路由快照、上游尝试和最终结果。"
      />
      <div className="grid min-h-[610px] grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)] overflow-hidden rounded-xl border">
        <div className="min-w-0 border-r">
          <div className="flex h-14 items-center justify-between border-b px-5">
            <div>
              <div className="text-sm font-semibold">逻辑请求</div>
              <div className="text-xs text-muted-foreground">最近 50 条</div>
            </div>
            <Badge variant="secondary">{items.length}</Badge>
          </div>
          <RequestList
            loading={requests.isLoading}
            items={items}
            selectedRequestId={requestId}
          />
        </div>
        <RequestInspector
          requestId={requestId}
          loading={detail.isLoading}
          data={detail.data}
        />
      </div>
    </div>
  );
}

function RequestList({
  loading,
  items,
  selectedRequestId,
}: {
  readonly loading: boolean;
  readonly items: NonNullable<ReturnType<typeof useRequests>["data"]>;
  readonly selectedRequestId: string | undefined;
}) {
  if (loading) {
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
  return (
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
        {items.map(item => (
          <TableRow
            key={item.id}
            className={cn(selectedRequestId === item.id && "bg-muted/70")}
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
              {item.ttftMs === null ? "—" : `${item.ttftMs} ms`}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatTime(item.startedAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RequestInspector({
  requestId,
  loading,
  data,
}: {
  readonly requestId: string | undefined;
  readonly loading: boolean;
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
  if (loading || data === undefined) {
    return <div className="p-5"><Skeleton className="h-64" /></div>;
  }
  return (
    <div className="flex flex-col">
      <div className="border-b px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">请求详情</div>
          <RequestStatus outcome={data.outcome} />
        </div>
        <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
          {data.id}
        </div>
      </div>
      <div className="flex flex-col gap-6 p-5 text-sm">
        <section className="grid grid-cols-2 gap-x-5 gap-y-4">
          <Fact label="请求模型" value={data.requestedModel} />
          <Fact label="上游模型" value={data.upstreamModel} />
          <Fact label="协议" value={data.protocol} />
          <Fact label="路由快照" value={`v${data.routingSnapshotVersion}`} />
          <Fact
            label="总延迟"
            value={data.latencyMs === null ? "—" : `${data.latencyMs} ms`}
          />
          <Fact label="TTFT" value={data.ttftMs === null ? "—" : `${data.ttftMs} ms`} />
        </section>
        <section>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            上游尝试链
          </div>
          <div className="flex flex-col gap-2">
            {data.attempts.map(attempt => (
              <div key={attempt.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    第
                    {attempt.sequence}
                    {" "}
                    次尝试
                  </span>
                  <StatusBadge tone={attemptTone(attempt.outcome)}>
                    {formatAttemptOutcome(attempt.outcome)}
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
                    {attempt.statusCode ?? "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          观测状态：
          {formatObservationStatus(data.observationStatus)}
          ；已观测
          {" "}
          {data.observedBytes.toLocaleString()}
          {" "}
          字节。完整 Secret 不会出现在此处。
        </section>
      </div>
    </div>
  );
}

function attemptTone(value: "running" | "succeeded" | "failed" | "client_cancelled") {
  switch (value) {
    case "succeeded": return "success" as const;
    case "failed": return "danger" as const;
    case "client_cancelled": return "warning" as const;
    case "running": return "neutral" as const;
  }
}

function formatAttemptOutcome(
  value: "running" | "succeeded" | "failed" | "client_cancelled",
): string {
  switch (value) {
    case "running": return "进行中";
    case "succeeded": return "成功";
    case "failed": return "失败";
    case "client_cancelled": return "客户端已取消";
  }
}

function formatObservationStatus(value: "pending" | "complete" | "incomplete"): string {
  switch (value) {
    case "pending": return "等待完成";
    case "complete": return "完整";
    case "incomplete": return "不完整";
  }
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}
