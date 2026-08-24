import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

import {
  resolveConnectionDetailTab,
  toConnectionDetailTabSearch,
} from "@/features/connections/connection-detail-tabs";
import { ConnectionsPage } from "@/features/connections/connections-page";
import { useModelBindings } from "@/features/models/hooks";

const connectionSearchSchema = z.object({
  connectionId: z.string().optional(),
  tab: z.string().optional(),
});

export const Route = createFileRoute("/_workspace/connections")({
  validateSearch: connectionSearchSchema,
  component: function ConnectionsRoute() {
    const { connectionId, tab: requestedTab } = Route.useSearch();
    const navigate = Route.useNavigate();
    const connectionTab = resolveConnectionDetailTab(requestedTab);
    const canonicalTabSearch = toConnectionDetailTabSearch(connectionTab);
    const modelBindings = useModelBindings();

    useEffect(() => {
      if (requestedTab === canonicalTabSearch)
        return;
      void navigate({
        replace: true,
        search: previous => ({
          ...previous,
          tab: canonicalTabSearch,
        }),
      });
    }, [canonicalTabSearch, navigate, requestedTab]);

    return (
      <ConnectionsPage
        connectionId={connectionId}
        connectionTab={connectionTab}
        modelBindings={{
          data: modelBindings.data,
          error: modelBindings.isError ? modelBindings.error : null,
          loading: modelBindings.isPending,
          onRetry: modelBindings.refetch,
          stale: modelBindings.isRefetchError && modelBindings.data !== undefined,
        }}
        onConnectionIdChange={(nextConnectionId, options) => {
          void navigate({
            replace: options?.replace ?? false,
            search: previous => ({
              ...previous,
              connectionId: nextConnectionId,
            }),
          });
        }}
        onConnectionTabChange={(nextTab) => {
          void navigate({
            search: previous => ({
              ...previous,
              tab: toConnectionDetailTabSearch(nextTab),
            }),
          });
        }}
      />
    );
  },
});
