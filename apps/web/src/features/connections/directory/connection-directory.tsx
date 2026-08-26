import type { useConnections } from "../shared/hooks";

import type { components } from "@/api/schema";
import { DataErrorState } from "@/components/product/data-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { describeApiError } from "@/lib/api-runtime/client";

import { cn } from "@/lib/utils";

type Connection = components["schemas"]["Connection"];

export function ConnectionDirectory({
  connections,
  error,
  loading,
  onRetry,
  onSelect,
  registerButton,
  selectedConnectionId,
  stale,
}: {
  readonly connections: ReturnType<typeof useConnections>["data"];
  readonly error: unknown;
  readonly loading: boolean;
  readonly onRetry: () => Promise<unknown>;
  readonly onSelect: (connectionId: string) => void;
  readonly registerButton: (connectionId: string, element: HTMLButtonElement | null) => void;
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
        {connections.map((item: Connection) => {
          const isSelected = selectedConnectionId === item.id;
          return (
            <button
              key={item.id}
              ref={element => registerButton(item.id, element)}
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
