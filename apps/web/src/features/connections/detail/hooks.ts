import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-runtime/client";

import {
  connectionDeletionImpactQueryOptions,
  invalidateDeletedConnectionDependencies,
} from "../shared/query-options";

export function useConnectionDeletionImpact(connectionId: string | undefined, enabled: boolean) {
  const resolvedConnectionId = connectionId ?? "__disabled__";
  const query = useQuery({
    ...connectionDeletionImpactQueryOptions(resolvedConnectionId),
    enabled: enabled && connectionId !== undefined,
    retry: false,
  });

  return { ...query, data: query.data?.data };
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();
  const mutation = api.useMutation("delete", "/admin/api/v1/connections/{connectionId}");

  return {
    ...mutation,
    remove: async (connectionId: string) => {
      const response = await mutation.mutateAsync({ params: { path: { connectionId } } });
      await invalidateDeletedConnectionDependencies(queryClient, connectionId);
      return response.data;
    },
  };
}
