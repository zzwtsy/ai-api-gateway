import type { ConnectionModelBindingsState } from "./connection-detail";
import type { ConnectionDetailTab } from "./connection-detail-tabs";

import { PlugZapIcon, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { DataErrorState } from "@/components/product/data-error-state";
import { PageHeader } from "@/components/product/page-header";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  const [sheetOpen, setSheetOpen] = useState(false);
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
      <PageHeader
        title="连接"
        description="管理上游 Provider Endpoint、协议和连接状态。"
        actions={(
          <Button onClick={() => setSheetOpen(true)}>
            <Plus data-icon="inline-start" />
            添加连接
          </Button>
        )}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>添加上游 Endpoint</SheetTitle>
            <SheetDescription>
              连接元数据保存在控制面；Provider Secret 不会进入浏览器持久化。
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <CreateConnectionForm
              onCreated={(createdConnectionId) => {
                onConnectionIdChange(createdConnectionId);
                setSheetOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {query.data?.length === 0
        ? (
            <Card>
              <CardContent className="pt-6">
                <Empty className="min-h-52 border-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon"><PlugZapIcon /></EmptyMedia>
                    <EmptyTitle>尚未创建控制面连接</EmptyTitle>
                    <EmptyDescription>
                      使用“添加连接”创建第一个上游 Endpoint。
                    </EmptyDescription>
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
                  <CardDescription>协议是硬边界；数据面不会跨协议转换。</CardDescription>
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
