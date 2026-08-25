import type { ReactNode } from "react";
import { Box, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { DataErrorState } from "@/components/product/data-error-state";
import { ModelBindingTable } from "@/components/product/model-binding-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { describeApiError } from "@/lib/api-runtime/client";

import { CreateModelBindingForm } from "./create-model-binding-form";
import { useModelBindings } from "./hooks";
import { ModelBindingDetail } from "./model-binding-detail";

export interface EndpointOption {
  readonly id: string;
  readonly label: string;
  readonly protocol: "openai-chat" | "openai-responses" | "anthropic-messages";
  readonly credentials: readonly {
    readonly id: string;
    readonly label: string;
  }[];
}

export function ModelsPage({
  endpointError,
  endpoints,
  endpointsLoading,
  modelBindingId,
  onModelBindingIdChange,
  onRetryEndpoints,
}: {
  readonly endpointError: unknown;
  readonly endpoints: readonly EndpointOption[] | undefined;
  readonly endpointsLoading: boolean;
  readonly modelBindingId: string | undefined;
  readonly onModelBindingIdChange: (modelBindingId: string | undefined, options?: { readonly replace?: boolean }) => void;
  readonly onRetryEndpoints: () => Promise<unknown>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const detailFocusRef = useRef<string | null>(null);
  const query = useModelBindings();
  const selectedBinding = query.data?.find(binding => binding.id === modelBindingId);

  useEffect(() => {
    if (modelBindingId === undefined || query.data === undefined || selectedBinding !== undefined)
      return;
    onModelBindingIdChange(undefined, { replace: true });
  }, [modelBindingId, onModelBindingIdChange, query.data, selectedBinding]);

  useEffect(() => {
    if (modelBindingId !== undefined)
      detailFocusRef.current = modelBindingId;
  }, [modelBindingId]);

  const endpointNames = new Map(endpoints?.map(endpoint => [endpoint.id, endpoint.label]));
  const closeDetailSheet = () => {
    if (modelBindingId === undefined)
      return;
    onModelBindingIdChange(undefined, { replace: true });
  };

  const detailFinalFocus = () => {
    const closedBindingId = detailFocusRef.current;
    detailFocusRef.current = null;
    return closedBindingId === null
      ? null
      : document.getElementById(`model-binding-detail-trigger-${closedBindingId}`);
  };

  return (
    <div className="flex min-h-0 flex-col gap-7">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus data-icon="inline-start" />
            添加模型绑定
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="px-6 pt-6 pb-5">
              <DialogTitle>添加模型绑定</DialogTitle>
              <DialogDescription>指定 Endpoint 和上游模型 ID。</DialogDescription>
            </DialogHeader>
            {dialogOpen && (
              <EndpointFormState
                endpoints={endpoints}
                error={endpointError}
                loading={endpointsLoading}
                onCancel={() => setDialogOpen(false)}
                onCreated={() => setDialogOpen(false)}
                onRetry={onRetryEndpoints}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Sheet
        open={selectedBinding !== undefined}
        onOpenChange={(open) => {
          if (!open)
            closeDetailSheet();
        }}
      >
        <SheetContent
          id="model-binding-detail-sheet"
          showCloseButton={false}
          finalFocus={detailFinalFocus}
          className="gap-0 overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        >
          {selectedBinding !== undefined && (
            <>
              <SheetHeader className="shrink-0 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <SheetTitle className="truncate">{selectedBinding.name}</SheetTitle>
                    <SheetDescription>
                      {endpointNames.get(selectedBinding.endpointId) ?? selectedBinding.endpointId}
                    </SheetDescription>
                  </div>
                  <SheetClose render={<Button type="button" size="icon-sm" variant="ghost" aria-label="关闭模型详情" />}>
                    <X />
                  </SheetClose>
                </div>
              </SheetHeader>
              <div data-slot="detail-sheet-body" className="min-h-0 flex-1 overflow-y-auto">
                <ModelBindingDetail
                  binding={selectedBinding}
                  endpointName={endpointNames.get(selectedBinding.endpointId) ?? selectedBinding.endpointId}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Card data-slot="models-master" className="min-w-0">
        <CardHeader>
          <CardTitle>Endpoint 模型绑定</CardTitle>
        </CardHeader>
        <CardContent>
          <ModelDirectory
            bindings={query.data}
            endpoints={endpoints}
            error={query.isError ? query.error : null}
            loading={query.isPending}
            onRetry={query.refetch}
            onSelect={onModelBindingIdChange}
            selectedBindingId={modelBindingId}
            stale={query.isRefetchError && query.data !== undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function EndpointFormState({
  endpoints,
  error,
  loading,
  onCancel,
  onCreated,
  onRetry,
}: {
  readonly endpoints: readonly EndpointOption[] | undefined;
  readonly error: unknown;
  readonly loading: boolean;
  readonly onCancel: () => void;
  readonly onCreated: () => void;
  readonly onRetry: () => Promise<unknown>;
}) {
  if (endpoints === undefined && error !== null) {
    return (
      <EndpointFormFallback onCancel={onCancel}>
        <DataErrorState
          title="无法加载 Endpoint"
          description={describeApiError(error, "模型绑定需要一个已配置的 Endpoint。")}
          onRetry={onRetry}
        />
      </EndpointFormFallback>
    );
  }
  if (loading || endpoints === undefined) {
    return (
      <EndpointFormFallback onCancel={onCancel}>
        <Skeleton className="h-48" />
      </EndpointFormFallback>
    );
  }
  if (endpoints.length === 0) {
    return (
      <EndpointFormFallback onCancel={onCancel}>
        <Empty className="min-h-48 border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Box /></EmptyMedia>
            <EmptyTitle>没有可绑定的 Endpoint</EmptyTitle>
            <EmptyDescription>请先在连接页创建上游 Endpoint，再返回添加模型绑定。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </EndpointFormFallback>
    );
  }
  return <CreateModelBindingForm endpoints={endpoints} onCancel={onCancel} onCreated={onCreated} />;
}

function EndpointFormFallback({ children, onCancel }: {
  readonly children: ReactNode;
  readonly onCancel: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 overflow-y-auto px-6 pb-6">{children}</div>
      <DialogFooter className="mx-0 mb-0 shrink-0 px-6 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
      </DialogFooter>
    </div>
  );
}

function ModelDirectory({
  bindings,
  endpoints,
  error,
  loading,
  onRetry,
  onSelect,
  selectedBindingId,
  stale,
}: {
  readonly bindings: ReturnType<typeof useModelBindings>["data"];
  readonly endpoints: readonly EndpointOption[] | undefined;
  readonly error: unknown;
  readonly loading: boolean;
  readonly onRetry: () => Promise<unknown>;
  readonly onSelect: (bindingId: string) => void;
  readonly selectedBindingId: string | undefined;
  readonly stale: boolean;
}) {
  if (bindings === undefined && error !== null) {
    return <DataErrorState title="无法加载模型绑定" description={describeApiError(error, "模型目录暂时不可用。")} onRetry={onRetry} />;
  }
  if (loading || bindings === undefined)
    return <Skeleton className="h-52" />;
  if (bindings.length === 0) {
    return (
      <Empty className="min-h-52 border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Box /></EmptyMedia>
          <EmptyTitle>尚未创建模型绑定</EmptyTitle>
          <EmptyDescription>使用“添加模型绑定”创建第一条记录。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  const endpointNames = new Map(endpoints?.map(endpoint => [endpoint.id, endpoint.label]));
  return (
    <>
      {stale && (
        <DataErrorState
          className="mb-4"
          tone="warning"
          title="模型目录可能已过期"
          description={describeApiError(error, "后台刷新失败，当前仍显示上次成功加载的数据。")}
          onRetry={onRetry}
        />
      )}
      <div className="overflow-x-auto">
        <ModelBindingTable
          bindings={bindings}
          endpointColumnLabel="Provider / Endpoint"
          endpointNames={endpointNames}
          onSelect={onSelect}
          selectedBindingId={selectedBindingId}
          showMetadata
        />
      </div>
    </>
  );
}
