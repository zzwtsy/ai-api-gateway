import { PlugZapIcon, Plus, X } from "lucide-react";
import { useState } from "react";

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
  const connections = query.data ?? [];

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="连接"
        description="管理上游 Provider Endpoint；账号与凭据将作为连接内部的耐久子资源扩展。"
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
              这里只创建连接元数据，不在浏览器中持久化 Provider Secret。
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
          <ConnectionDirectory loading={query.isLoading} connections={connections} />
          {query.isError && (
            <p className="mt-4 text-sm text-destructive">
              {describeApiError(query.error, "无法加载连接")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
function ConnectionDirectory({
  loading,
  connections,
}: {
  readonly loading: boolean;
  readonly connections: NonNullable<ReturnType<typeof useConnections>["data"]>;
}) {
  if (loading) {
    return <Skeleton className="h-52" />;
  }
  if (connections.length === 0) {
    return (
      <Empty className="min-h-52 border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon"><PlugZapIcon /></EmptyMedia>
          <EmptyTitle>尚未创建控制面连接</EmptyTitle>
          <EmptyDescription>
            数据面黄金路径暂时使用环境变量中的模拟上游。
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
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
  );
}
