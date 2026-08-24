import { Box, Plus } from "lucide-react";
import { useState } from "react";

import { DataErrorState } from "@/components/product/data-error-state";
import { ModelBindingTable } from "@/components/product/model-binding-table";
import { PageHeader } from "@/components/product/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { describeApiError } from "@/lib/api-runtime/client";

import { CreateModelBindingForm } from "./create-model-binding-form";
import { useModelBindings } from "./hooks";

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
  onRetryEndpoints,
}: {
  readonly endpointError: unknown;
  readonly endpoints: readonly EndpointOption[] | undefined;
  readonly endpointsLoading: boolean;
  readonly onRetryEndpoints: () => Promise<unknown>;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const query = useModelBindings();

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="模型"
        description="管理每个 Endpoint 上可明确调用的上游模型绑定。"
        actions={(
          <Button onClick={() => setSheetOpen(true)} disabled={endpoints?.length === 0}>
            <Plus data-icon="inline-start" />
            添加模型绑定
          </Button>
        )}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>添加模型绑定</SheetTitle>
            <SheetDescription>新绑定先标记为“未验证”，不会推断能力或价格。</SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <EndpointFormState
              endpoints={endpoints}
              error={endpointError}
              loading={endpointsLoading}
              onCreated={() => setSheetOpen(false)}
              onRetry={onRetryEndpoints}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Card>
        <CardHeader>
          <CardTitle>Endpoint 模型绑定</CardTitle>
          <CardDescription>同一模型在不同 Endpoint 上保持独立记录。</CardDescription>
        </CardHeader>
        <CardContent>
          <ModelDirectory
            bindings={query.data}
            endpoints={endpoints}
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

function EndpointFormState({
  endpoints,
  error,
  loading,
  onCreated,
  onRetry,
}: {
  readonly endpoints: readonly EndpointOption[] | undefined;
  readonly error: unknown;
  readonly loading: boolean;
  readonly onCreated: () => void;
  readonly onRetry: () => Promise<unknown>;
}) {
  if (endpoints === undefined && error !== null) {
    return (
      <DataErrorState
        title="无法加载 Endpoint"
        description={describeApiError(error, "模型绑定需要一个已配置的 Endpoint。")}
        onRetry={onRetry}
      />
    );
  }
  if (loading || endpoints === undefined)
    return <Skeleton className="h-48" />;
  if (endpoints.length === 0) {
    return (
      <Empty className="min-h-48 border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Box /></EmptyMedia>
          <EmptyTitle>没有可绑定的 Endpoint</EmptyTitle>
          <EmptyDescription>请先在连接页创建上游 Endpoint。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return <CreateModelBindingForm endpoints={endpoints} onCreated={onCreated} />;
}

function ModelDirectory({
  bindings,
  endpoints,
  error,
  loading,
  onRetry,
  stale,
}: {
  readonly bindings: ReturnType<typeof useModelBindings>["data"];
  readonly endpoints: readonly EndpointOption[] | undefined;
  readonly error: unknown;
  readonly loading: boolean;
  readonly onRetry: () => Promise<unknown>;
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
          <EmptyDescription>把真实上游模型 ID 绑定到已配置的 Endpoint。</EmptyDescription>
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
          showMetadata
        />
      </div>
    </>
  );
}
