import type { operations } from "@/api/schema";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-runtime/client";

export type CreateModelBindingInput
  = operations["createProviderModelBinding"]["requestBody"]["content"]["application/json"];
export type DiscoverUpstreamModelsInput
  = operations["discoverUpstreamModels"]["requestBody"]["content"]["application/json"];

function modelBindingsQueryOptions() {
  return api.queryOptions("get", "/admin/api/v1/models");
}

export function useModelBindings() {
  return useQuery({
    ...modelBindingsQueryOptions(),
    retry: false,
    select: response => response.data,
  });
}

export function useCreateModelBinding() {
  const queryClient = useQueryClient();
  const mutation = api.useMutation("post", "/admin/api/v1/models", {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: modelBindingsQueryOptions().queryKey });
    },
  });

  return {
    ...mutation,
    create: (input: CreateModelBindingInput) => mutation.mutateAsync({ body: input }),
  };
}

export function useDiscoverUpstreamModels() {
  const mutation = api.useMutation("post", "/admin/api/v1/endpoints/{endpointId}/models/discover");
  return {
    ...mutation,
    discover: async (endpointId: string, input: DiscoverUpstreamModelsInput) => {
      const response = await mutation.mutateAsync({ params: { path: { endpointId } }, body: input });
      return response.data;
    },
  };
}
