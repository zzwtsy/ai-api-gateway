import type { DeletionDialogController } from "../shared/deletion-dialog";
import type { components } from "@/api/schema";

import { Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { Button } from "@/components/ui/button";
import { useConnectionDeletionImpact, useDeleteConnection } from "../hooks";
import {
  DeletionDialog,
  DeletionDialogContent,
  DeletionImpactCounts,
  DeletionImpactState,
} from "../shared/deletion-dialog";

type ConnectionDeletionImpact = components["schemas"]["ConnectionDeletionImpact"];

export function DeleteConnectionDialog({
  connectionId,
  connectionName,
  finalFocus,
  onDeleted,
}: {
  readonly connectionId: string;
  readonly connectionName: string;
  readonly finalFocus: () => HTMLElement | null;
  readonly onDeleted: (connectionId: string) => void;
}) {
  return (
    <DeletionDialog
      finalFocus={finalFocus}
      trigger={(
        <Button type="button" size="sm" variant="ghost" aria-label="删除连接">
          <Trash2 data-icon="inline-start" />
          删除连接
        </Button>
      )}
    >
      {controller => (
        <DeleteConnectionContent
          connectionId={connectionId}
          connectionName={connectionName}
          controller={controller}
          onDeleted={() => onDeleted(connectionId)}
        />
      )}
    </DeletionDialog>
  );
}

function DeleteConnectionContent({
  connectionId,
  connectionName,
  controller,
  onDeleted,
}: {
  readonly connectionId: string;
  readonly connectionName: string;
  readonly controller: DeletionDialogController;
  readonly onDeleted: () => void;
}) {
  const impact = useConnectionDeletionImpact(connectionId, true);
  const deletion = useDeleteConnection();
  const loadingImpact = impact.isPending || impact.isFetching;
  const canDelete = impact.data !== undefined
    && !loadingImpact
    && !impact.isError
    && !impact.data.blocked
    && impact.data.blockedReason === null
    && impact.data.activeProbeRunCount === 0;

  const remove = () => {
    if (!canDelete)
      return;
    void controller.confirm(
      () => deletion.remove(connectionId),
      onDeleted,
    );
  };

  return (
    <DeletionDialogContent
      canDelete={canDelete}
      deleteError={deletion.isError ? deletion.error : null}
      deleteErrorFallback="删除请求失败，请重试。"
      deleteErrorTitle="无法删除连接"
      description="删除会清理该连接下的 Endpoint、账号、Credential、模型绑定和兼容性结果，且无法撤销；历史 Request 和 Attempt 会保留。"
      finalFocus={controller.finalFocus}
      icon={<Trash2 />}
      impact={(
        <ConnectionDeletionImpactState
          error={impact.error}
          impact={impact.data}
          loading={loadingImpact}
          onRetry={() => void impact.refetch()}
        />
      )}
      onConfirm={remove}
      pending={controller.pending}
      title={(
        <>
          删除连接
          {" "}
          {connectionName}
          ？
        </>
      )}
    />
  );
}

function ConnectionDeletionImpactState({
  error,
  impact,
  loading,
  onRetry,
}: {
  readonly error: unknown;
  readonly impact: ConnectionDeletionImpact | undefined;
  readonly loading: boolean;
  readonly onRetry: () => void;
}) {
  return (
    <DeletionImpactState
      error={error}
      loading={loading}
      loadingClassName="h-52"
      onRetry={onRetry}
    >
      {impact === undefined
        ? null
        : (
            <div className="flex flex-col gap-3">
              <DeletionImpactCounts counts={[
                ["Endpoint", impact.endpointCount],
                ["账号", impact.accountCount],
                ["Credential", impact.credentialCount],
                ["Credential 绑定", impact.credentialBindingCount],
                ["模型绑定", impact.modelBindingCount],
                ["Compatibility Profile", impact.compatibilityProfileCount],
                ["Compatibility Fact", impact.compatibilityFactCount],
                ["已完成 Probe", impact.completedProbeRunCount],
                ["进行中 Probe", impact.activeProbeRunCount],
              ]}
              />
              <p className="text-xs text-muted-foreground">
                已完成 Compatibility Probe 会随连接删除；历史 Request 和 Attempt 不受影响。
              </p>
              {impact.blocked && (
                <Alert variant="destructive">
                  <AlertTitle>当前不能删除</AlertTitle>
                  <AlertDescription>
                    有
                    {" "}
                    {impact.activeProbeRunCount}
                    {" "}
                    个进行中的 Probe，请等待测试结束后重新加载影响。
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
    </DeletionImpactState>
  );
}
