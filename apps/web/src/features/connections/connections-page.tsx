import type { ConnectionModelBindingsState } from "./connection-detail";
import type { ConnectionDetailTab } from "./connection-detail-tabs";

import { PlugZapIcon, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { DataErrorState } from "@/components/product/data-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { describeApiError } from "@/lib/api-runtime/client";
import { cn } from "@/lib/utils";

import { ConnectionDetail } from "./connection-detail";
import { CreateConnectionForm } from "./create-connection-form";
import { useConnections } from "./hooks";

export function ConnectionsPage({
  connectionId,
  connectionTab,
  modelBindings,
  onConnectionIdChange,
  onConnectionTabChange,
}: {
  readonly connectionId: string | undefined;
  readonly connectionTab: ConnectionDetailTab;
  readonly modelBindings: ConnectionModelBindingsState;
  readonly onConnectionIdChange: (
    connectionId: string | undefined,
    options?: { readonly replace?: boolean },
  ) => void;
  readonly onConnectionTabChange: (tab: ConnectionDetailTab) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const query = useConnections();
  const selectedConnection = query.data?.find(connection => connection.id === connectionId)
    ?? query.data?.[0];

  useEffect(() => {
    if (query.data === undefined)
      return;
    const canonicalConnectionId = selectedConnection?.id;
    if (canonicalConnectionId !== connectionId)
      onConnectionIdChange(canonicalConnectionId, { replace: true });
  }, [connectionId, onConnectionIdChange, query.data, selectedConnection?.id]);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus data-icon="inline-start" />
            添加连接
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="px-6 pt-6 pb-5">
              <DialogTitle>添加连接</DialogTitle>
            </DialogHeader>
            {dialogOpen && (
              <CreateConnectionForm
                onCancel={() => setDialogOpen(false)}
                onCreated={(createdConnectionId) => {
                  onConnectionIdChange(createdConnectionId);
                  setDialogOpen(false);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {query.data?.length === 0
        ? (
            <Card>
              <CardContent className="pt-6">
                <Empty className="min-h-52 border-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon"><PlugZapIcon /></EmptyMedia>
                    <EmptyTitle>尚未添加连接</EmptyTitle>
                    <EmptyDescription>使用“添加连接”配置第一个 Provider Endpoint。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </Card>
          )
        : (
            <div className="grid min-h-[560px] gap-6 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
              <Card className="flex flex-col">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle>Provider 目录</CardTitle>
                    <Badge variant="secondary">{query.data?.length ?? "—"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <ConnectionDirectory
                    connections={query.data}
                    error={query.isError ? query.error : null}
                    loading={query.isPending}
                    onRetry={query.refetch}
                    onSelect={onConnectionIdChange}
                    selectedConnectionId={selectedConnection?.id ?? null}
                    stale={query.isRefetchError && query.data !== undefined}
                  />
                </CardContent>
              </Card>

              <div className="min-w-0">
                {selectedConnection !== undefined && (
                  <ConnectionDetail
                    key={selectedConnection.id}
                    connection={selectedConnection}
                    modelBindings={modelBindings}
                    onTabChange={onConnectionTabChange}
                    tab={connectionTab}
                  />
                )}
              </div>
            </div>
          )}
    </div>
  );
}

function ConnectionDirectory({
  connections,
  error,
  loading,
  onRetry,
  onSelect,
  selectedConnectionId,
  stale,
}: {
  readonly connections: ReturnType<typeof useConnections>["data"];
  readonly error: unknown;
  readonly loading: boolean;
  readonly onRetry: () => Promise<unknown>;
  readonly onSelect: (connectionId: string) => void;
  readonly selectedConnectionId: string | null;
  readonly stale: boolean;
}) {
  if (connections === undefined && error !== null) {
    return (
      <div className="p-4">
        <DataErrorState
          title="无法加载连接"
          description={describeApiError(error, "连接目录暂时不可用。")}
          onRetry={onRetry}
        />
      </div>
    );
  }
  if (loading || connections === undefined) {
    return <div className="p-4"><Skeleton className="h-52" /></div>;
  }
  if (connections.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col">
      {stale && (
        <div className="p-3">
          <DataErrorState
            tone="warning"
            title="连接目录可能已过期"
            description={describeApiError(error, "后台刷新失败，当前仍显示上次成功加载的数据。")}
            onRetry={onRetry}
          />
        </div>
      )}
      <div className="flex flex-col gap-1 p-2" aria-label="Provider 列表">
        {connections.map((item) => {
          const isSelected = selectedConnectionId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isSelected}
              className={cn(
                "w-full truncate rounded-lg px-3 py-2.5 text-left text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                isSelected && "bg-muted text-foreground",
              )}
              title={item.name}
              onClick={() => onSelect(item.id)}
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
