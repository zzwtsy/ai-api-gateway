import type { operations } from "@/api/schema";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-runtime/client";

import {
  connectionsQueryOptions,
  endpointDeletionImpactQueryOptions,
  invalidateEndpointDependencies,
} from "../shared/query-options";

export type AddConnectionEndpointInput
  = operations["addConnectionEndpoints"]["requestBody"]["content"]["application/json"];
export type UpdateEndpointInput
  = operations["updateEndpoint"]["requestBody"]["content"]["application/json"];

export function useAddConnectionEndpoint() {
  const queryClient = useQueryClient();
  const mutation = api.useMutation("post", "/admin/api/v1/connections/{connectionId}/endpoints", {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: connectionsQueryOptions().queryKey });
    },
  });
  return {
    ...mutation,
    add: async (connectionId: string, input: AddConnectionEndpointInput) => {
      const response = await mutation.mutateAsync({ params: { path: { connectionId } }, body: input });
      return response.data;
    },
  };
}

export function useUpdateEndpoint(connectionId: string) {
  const queryClient = useQueryClient();
  const mutation = api.useMutation("patch", "/admin/api/v1/endpoints/{endpointId}", {
    onSuccess: async () => invalidateEndpointDependencies(queryClient, connectionId),
  });

  return {
    ...mutation,
    update: async (endpointId: string, input: UpdateEndpointInput) => {
      const response = await mutation.mutateAsync({
        params: { path: { endpointId } },
        body: input,
      });
      return response.data;
    },
  };
}

export function useEndpointDeletionImpact(endpointId: string | undefined, enabled: boolean) {
  const resolvedEndpointId = endpointId ?? "__disabled__";
  const query = useQuery({
    ...endpointDeletionImpactQueryOptions(resolvedEndpointId),
    enabled: enabled && endpointId !== undefined,
    retry: false,
  });

  return { ...query, data: query.data?.data };
}

export function useDeleteEndpoint(connectionId: string) {
  const queryClient = useQueryClient();
  const mutation = api.useMutation("delete", "/admin/api/v1/endpoints/{endpointId}", {
    onSuccess: async () => invalidateEndpointDependencies(queryClient, connectionId),
  });

  return {
    ...mutation,
    remove: async (endpointId: string) => {
      const response = await mutation.mutateAsync({ params: { path: { endpointId } } });
      return response.data;
    },
  };
}
