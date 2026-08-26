import type { components } from "@/api/schema";

import { Link } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";

import { DataErrorState } from "@/components/product/data-error-state";
import { ModelBindingTable } from "@/components/product/model-binding-table";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { describeApiError } from "@/lib/api-runtime/client";

type ModelBinding = components["schemas"]["ProviderModelBinding"];

export function ConnectionModelDirectory({
  bindings,
  endpointNames,
  error,
  loading,
  onRetry,
  stale,
}: {
  readonly bindings: readonly ModelBinding[] | undefined;
  readonly endpointNames: ReadonlyMap<string, string>;
  readonly error: unknown;
  readonly loading: boolean;
  readonly onRetry: () => Promise<unknown>;
  readonly stale: boolean;
}) {
  return (
    <section aria-labelledby="connection-models-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="connection-models-title" className="text-sm font-medium">模型绑定</h3>
        </div>
        <Link to="/models" className={buttonVariants({ variant: "outline", size: "sm" })}>
          管理全部模型
          <ArrowRight data-icon="inline-end" />
        </Link>
      </div>
      <ConnectionModelDirectoryState
        bindings={bindings}
        endpointNames={endpointNames}
        error={error}
        loading={loading}
        onRetry={onRetry}
        stale={stale}
      />
    </section>
  );
}

function ConnectionModelDirectoryState({
  bindings,
  endpointNames,
  error,
  loading,
  onRetry,
  stale,
}: {
  readonly bindings: readonly ModelBinding[] | undefined;
  readonly endpointNames: ReadonlyMap<string, string>;
  readonly error: unknown;
  readonly loading: boolean;
  readonly onRetry: () => Promise<unknown>;
  readonly stale: boolean;
}) {
  if (bindings === undefined && error !== null) {
    return (
      <DataErrorState
        title="无法加载模型绑定"
        description={describeApiError(error, "当前连接的模型目录暂时不可用。")}
        onRetry={onRetry}
      />
    );
  }
  if (loading || bindings === undefined)
    return <Skeleton className="h-44" />;
  if (bindings.length === 0) {
    return (
      <Empty className="min-h-44 border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Info /></EmptyMedia>
          <EmptyTitle>当前连接没有模型绑定</EmptyTitle>
          <EmptyDescription>可前往模型页，为此连接的 Endpoint 添加真实上游模型 ID。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {stale && (
        <DataErrorState
          tone="warning"
          title="模型绑定可能已过期"
          description={describeApiError(error, "后台刷新失败，当前仍显示上次成功加载的数据。")}
          onRetry={onRetry}
        />
      )}
      <div className="overflow-x-auto rounded-lg border">
        <ModelBindingTable
          bindings={bindings}
          endpointColumnLabel="Endpoint"
          endpointNames={endpointNames}
        />
      </div>
    </div>
  );
}
