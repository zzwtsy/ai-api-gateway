import type { operations } from "@/api/schema";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-runtime/client";

import {
  connectionCompatibilityQueryOptions,
  connectionsQueryOptions,
} from "../shared/query-options";

export type StartCompatibilityProbeInput
  = operations["probeEndpoint"]["requestBody"]["content"]["application/json"];

export function useConnectionCompatibility(connectionId: string) {
  const options = connectionCompatibilityQueryOptions(connectionId);
  const query = useQuery({
    ...options,
    retry: false,
    refetchInterval: (state) => {
      const response = state.state.data;
      return response !== undefined
        && response.data.runs.some(run => run.status === "queued" || run.status === "running")
        ? 750
        : false;
    },
  });
  return { ...query, data: query.data?.data };
}

export function useStartCompatibilityProbe(connectionId: string) {
  const queryClient = useQueryClient();
  const mutation = api.useMutation("post", "/admin/api/v1/endpoints/{endpointId}/probe", {
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: connectionCompatibilityQueryOptions(connectionId).queryKey }),
        queryClient.invalidateQueries({ queryKey: connectionsQueryOptions().queryKey }),
      ]);
    },
  });
  return {
    ...mutation,
    start: async (endpointId: string, input: StartCompatibilityProbeInput) => {
      const response = await mutation.mutateAsync({ params: { path: { endpointId } }, body: input });
      return response.data;
    },
  };
}
