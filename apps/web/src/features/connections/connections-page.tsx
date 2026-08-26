import type { ConnectionDetailTab } from "./connection-detail-tabs";
import type { ConnectionModelBindingsState } from "./types";

import { PlugZapIcon, Plus } from "lucide-react";
import { useState } from "react";

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

import { CreateConnectionForm } from "./create/create-connection-form";
import { ConnectionDetail } from "./detail/connection-detail";
import { ConnectionDirectory } from "./directory/connection-directory";
import { useConnectionDeletionLifecycle } from "./directory/use-connection-deletion-lifecycle";
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
  const deletion = useConnectionDeletionLifecycle({
    connectionId,
    connections: query.data,
    onConnectionIdChange,
    selectedConnectionId: selectedConnection?.id,
  });

  return (
    <div className="flex flex-col gap-7">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button ref={deletion.addConnectionTriggerRef} />}>
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
            <div className="grid min-h-140 gap-6 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
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
                    registerButton={deletion.registerDirectoryButton}
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
                    getConnectionDeletionFocus={deletion.getConnectionDeletionFocus}
                    modelBindings={modelBindings}
                    onConnectionDeleted={deletion.handleConnectionDeleted}
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
