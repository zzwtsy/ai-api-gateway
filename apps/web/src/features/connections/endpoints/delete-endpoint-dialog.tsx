import type { RefObject } from "react";
import type { DeletionDialogController } from "../shared/deletion-dialog";

import { Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { useDeleteEndpoint, useEndpointDeletionImpact } from "../hooks";
import {
  DeletionDialog,
  DeletionDialogContent,
  DeletionImpactCounts,
  DeletionImpactState,
} from "../shared/deletion-dialog";

export function DeleteEndpointDialog({
  connectionId,
  endpointId,
  endpointName,
  successFocusRef,
}: {
  readonly connectionId: string;
  readonly endpointId: string;
  readonly endpointName: string;
  readonly successFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <DeletionDialog
      finalFocus={() => successFocusRef.current}
      trigger={(
        <Button type="button" size="xs" variant="ghost" aria-label={`删除 ${endpointName}`}>
          <Trash2 data-icon="inline-start" />
          删除
        </Button>
      )}
    >
      {controller => (
        <DeleteEndpointContent
          connectionId={connectionId}
          endpointId={endpointId}
          endpointName={endpointName}
          controller={controller}
        />
      )}
    </DeletionDialog>
  );
}

function DeleteEndpointContent({
  connectionId,
  endpointId,
  endpointName,
  controller,
}: {
  readonly connectionId: string;
  readonly endpointId: string;
  readonly endpointName: string;
  readonly controller: DeletionDialogController;
}) {
  const impact = useEndpointDeletionImpact(endpointId, true);
  const deletion = useDeleteEndpoint(connectionId);
  const loadingImpact = impact.isPending || impact.isFetching;
  const canDelete = impact.data !== undefined
    && !loadingImpact
    && !impact.isError
    && !impact.data.blocked
    && impact.data.activeProbeRunCount === 0;

  const remove = () => {
    if (!canDelete)
      return;
    void controller.confirm(() => deletion.remove(endpointId));
  };

  return (
    <DeletionDialogContent
      canDelete={canDelete}
      deleteError={deletion.isError ? deletion.error : null}
      deleteErrorFallback="删除请求失败，请重试。"
      deleteErrorTitle="无法删除 Endpoint"
      description="删除前会核对实时影响。该操作无法撤销；已完成 Compatibility Probe 会随 Endpoint 删除，历史 Request 和 Attempt 保留。"
      finalFocus={controller.finalFocus}
      icon={<Trash2 />}
      impact={(
        <EndpointDeletionImpactState
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
          删除
          {endpointName}
          ？
        </>
      )}
    />
  );
}

function EndpointDeletionImpactState({
  error,
  impact,
  loading,
  onRetry,
}: {
  readonly error: unknown;
  readonly impact: ReturnType<typeof useEndpointDeletionImpact>["data"];
  readonly loading: boolean;
  readonly onRetry: () => void;
}) {
  return (
    <DeletionImpactState
      error={error}
      loading={loading}
      loadingClassName="h-40"
      onRetry={onRetry}
    >
      {impact === undefined
        ? null
        : (
            <div className="flex flex-col gap-3">
              <DeletionImpactCounts counts={[
                ["Credential 绑定", impact.credentialBindingCount],
                ["模型绑定", impact.modelBindingCount],
                ["兼容性 Profile", impact.compatibilityProfileCount],
                ["兼容性 Fact", impact.compatibilityFactCount],
                ["已完成 Probe", impact.completedProbeRunCount],
                ["进行中 Probe", impact.activeProbeRunCount],
              ]}
              />
              <p className="text-xs text-muted-foreground">
                已完成 Compatibility Probe 记录会随 Endpoint 一并删除；历史 Request 和 Attempt 不受影响。
              </p>
              {(impact.blocked || impact.activeProbeRunCount > 0) && (
                <Alert variant="destructive">
                  <AlertTitle>当前不能删除</AlertTitle>
                  <AlertDescription>
                    有
                    {impact.activeProbeRunCount}
                    个进行中的 Probe。请等待测试结束后重新加载影响。
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
    </DeletionImpactState>
  );
}
