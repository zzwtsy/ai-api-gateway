import type { useGatewayClients } from "./hooks";

import type { components } from "@/api/schema";
import { KeyRound, Plus } from "lucide-react";

import { DataErrorState } from "@/components/product/data-error-state";
import { StatusBadge } from "@/components/product/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { describeApiError } from "@/lib/api-runtime/client";
import {
  clientProtocolLabel,
  formatClientLastUsedAt,
  gatewayClientStatusLabel,
  gatewayClientStatusTone,
  usableGatewayClientKeyCount,
} from "./client-view-model";

type GatewayClient = components["schemas"]["GatewayClient"];

export function ClientDirectory({ clients, error, loading, onRetry, onSelect, onStartCreate, selectedClientId, stale }: {
  readonly clients: ReturnType<typeof useGatewayClients>["data"];
  readonly error: unknown;
  readonly loading: boolean;
  readonly onRetry: () => Promise<unknown>;
  readonly onSelect: (clientId: string) => void;
  readonly onStartCreate: () => void;
  readonly selectedClientId: string | undefined;
  readonly stale: boolean;
}) {
  if (clients === undefined && error !== null)
    return <DataErrorState title="无法加载客户端" description={describeApiError(error, "客户端目录暂时不可用。")} onRetry={onRetry} />;
  if (loading || clients === undefined)
    return <Skeleton className="h-52" />;
  if (clients.length === 0) {
    return (
      <Empty className="min-h-52 border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon"><KeyRound /></EmptyMedia>
          <EmptyTitle>尚未创建 Gateway 客户端</EmptyTitle>
          <EmptyDescription>为第一个 Harness 实例签发独立 Key。</EmptyDescription>
        </EmptyHeader>
        <Button type="button" variant="outline" onClick={onStartCreate}>
          <Plus data-icon="inline-start" />
          添加客户端
        </Button>
      </Empty>
    );
  }
  return (
    <>
      {stale && <DataErrorState className="mb-4" tone="warning" title="客户端目录可能已过期" description={describeApiError(error, "后台刷新失败，当前仍显示上次成功加载的数据。")} onRetry={onRetry} />}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>客户端</TableHead>
              <TableHead>协议</TableHead>
              <TableHead>Gateway Key</TableHead>
              <TableHead>最后使用</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map(client => (
              <ClientRow
                key={client.id}
                client={client}
                selected={client.id === selectedClientId}
                onSelect={onSelect}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function ClientRow({ client, onSelect, selected }: {
  readonly client: GatewayClient;
  readonly onSelect: (clientId: string) => void;
  readonly selected: boolean;
}) {
  const usableKeyCount = usableGatewayClientKeyCount(client);
  return (
    <TableRow aria-selected={selected} data-state={selected ? "selected" : undefined}>
      <TableCell>
        <div className="flex min-w-0 items-center gap-2">
          <div className="max-w-64 truncate font-medium" title={client.name}>{client.name}</div>
          <StatusBadge className="shrink-0" tone={gatewayClientStatusTone(client.status)}>{gatewayClientStatusLabel(client.status)}</StatusBadge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {client.allowedProtocols.map(protocol => <Badge key={protocol} variant="outline">{clientProtocolLabel(protocol)}</Badge>)}
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium">
          {usableKeyCount}
          {" "}
          个可用
        </div>
        <div className="text-xs text-muted-foreground">
          共
          {" "}
          {client.keys.length}
          {" "}
          个
        </div>
      </TableCell>
      <TableCell>{formatClientLastUsedAt(client.lastUsedAt)}</TableCell>
      <TableCell className="text-right">
        <Button
          id={`client-detail-trigger-${client.id}`}
          type="button"
          size="sm"
          variant="outline"
          aria-controls="client-inspector"
          aria-expanded={selected}
          onClick={() => onSelect(client.id)}
        >
          查看详情
        </Button>
      </TableCell>
    </TableRow>
  );
}
