import { PlugZapIcon, Plus, X } from "lucide-react";
import { useState } from "react";

import { DataErrorState } from "@/components/product/data-error-state";
import { PageHeader } from "@/components/product/page-header";
import { StatusBadge } from "@/components/product/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

import { CreateConnectionForm } from "./create-connection-form";
import { useConnections } from "./hooks";

export function ConnectionsPage() {
  const [creating, setCreating] = useState(false);
  const query = useConnections();

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="连接"
        description="管理上游 Provider Endpoint、协议和连接状态。"
        actions={(
          <Button onClick={() => setCreating(value => !value)}>
            {creating
              ? <X data-icon="inline-start" />
              : <Plus data-icon="inline-start" />}
            {creating ? "关闭" : "添加连接"}
          </Button>
        )}
      />
      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>添加上游 Endpoint</CardTitle>
            <CardDescription>
              连接元数据保存在控制面；Provider Secret 不会进入浏览器持久化。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateConnectionForm onCreated={() => setCreating(false)} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>上游 Provider 目录</CardTitle>
          <CardDescription>协议是硬边界；数据面不会跨协议转换。</CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectionDirectory
            connections={query.data}
            error={query.isError ? query.error : null}
            loading={query.isPending}
            onRetry={query.refetch}
            stale={query.isRefetchError && query.data !== undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
function ConnectionDirectory({
  connections,
  error,
  loading,
  onRetry,
  stale,
}: {
  readonly connections: ReturnType<typeof useConnections>["data"];
  readonly error: unknown;
  readonly loading: boolean;
  readonly onRetry: () => Promise<unknown>;
  readonly stale: boolean;
}) {
  if (connections === undefined && error !== null) {
    return (
      <DataErrorState
        title="无法加载连接"
        description={describeApiError(error, "连接目录暂时不可用。")}
        onRetry={onRetry}
      />
    );
  }
  if (loading || connections === undefined) {
    return <Skeleton className="h-52" />;
  }
  if (connections.length === 0) {
    return (
      <Empty className="min-h-52 border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon"><PlugZapIcon /></EmptyMedia>
          <EmptyTitle>尚未创建控制面连接</EmptyTitle>
          <EmptyDescription>
            使用“添加连接”创建第一个上游 Endpoint。
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <>
      {stale && (
        <DataErrorState
          className="mb-4"
          tone="warning"
          title="连接目录可能已过期"
          description={describeApiError(error, "后台刷新失败，当前仍显示上次成功加载的数据。")}
          onRetry={onRetry}
        />
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>连接</TableHead>
            <TableHead>协议</TableHead>
            <TableHead>Endpoint</TableHead>
            <TableHead>状态</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {connections.map(item => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.provider}</div>
              </TableCell>
              <TableCell><Badge variant="outline">{item.protocol}</Badge></TableCell>
              <TableCell className="max-w-[420px] truncate font-mono text-xs">
                {item.baseUrl}
              </TableCell>
              <TableCell>
                <StatusBadge tone={item.enabled ? "success" : "neutral"}>
                  {item.enabled ? "启用" : "停用"}
                </StatusBadge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
