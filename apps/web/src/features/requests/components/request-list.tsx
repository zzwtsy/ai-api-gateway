import type { useRequests } from "../hooks";
import { Link } from "@tanstack/react-router";

import { SendIcon } from "lucide-react";
import { DataErrorState } from "@/components/product/data-error-state";
import { RequestStatus } from "@/components/product/request-status";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
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
import { toRequestListItemView } from "../request-view-model";

export function RequestList({
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
      <Empty className="min-h-105 border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon"><SendIcon /></EmptyMedia>
          <EmptyTitle>还没有请求</EmptyTitle>
          <EmptyDescription>
            配置客户端并发送请求后，可在这里查看诊断信息。
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link to="/clients" className={buttonVariants({ variant: "outline" })}>配置客户端</Link>
        </EmptyContent>
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
