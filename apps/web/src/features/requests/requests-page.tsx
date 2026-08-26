import { Badge } from "@/components/ui/badge";

import { RequestInspector } from "./components/request-inspector";
import { RequestList } from "./components/request-list";
import { useRequest, useRequests } from "./hooks";

export function RequestsPage({ requestId }: { readonly requestId: string | undefined }) {
  const requests = useRequests();
  const detail = useRequest(requestId);

  return (
    <div className="flex flex-col gap-7">
      <div
        data-slot="request-workbench"
        className="grid min-h-152.5 overflow-hidden rounded-xl border aigw-desktop:grid-cols-[minmax(var(--aigw-layout-request-master-min),1.3fr)_minmax(var(--aigw-layout-request-inspector-min),0.7fr)]"
      >
        <section
          data-slot="request-master"
          aria-labelledby="request-list-title"
          className="min-w-0 border-b aigw-desktop:border-r aigw-desktop:border-b-0"
        >
          <div className="flex h-14 items-center justify-between border-b px-5">
            <div>
              <div id="request-list-title" className="text-sm font-semibold">逻辑请求</div>
              <div className="text-xs text-muted-foreground">最近 50 条</div>
            </div>
            <Badge variant="secondary">{requests.data?.length ?? "—"}</Badge>
          </div>
          <RequestList
            error={requests.isError ? requests.error : null}
            items={requests.data}
            loading={requests.isPending}
            onRetry={requests.refetch}
            selectedRequestId={requestId}
            stale={requests.isRefetchError && requests.data !== undefined}
          />
        </section>
        <section data-slot="request-inspector" aria-label="请求详情" className="min-w-0">
          <RequestInspector
            error={detail.isError ? detail.error : null}
            requestId={requestId}
            loading={detail.isPending}
            onRetry={detail.refetch}
            stale={detail.isRefetchError && detail.data !== undefined}
            data={detail.data}
          />
        </section>
      </div>
    </div>
  );
}
