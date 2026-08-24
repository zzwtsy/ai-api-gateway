import type { operations } from "@/api/schema";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-runtime/client";

export type CreateConnectionInput
  = operations["createConnection"]["requestBody"]["content"]["application/json"];

function connectionsQueryOptions() {
  return api.queryOptions("get", "/admin/api/v1/connections");
}

export function useConnections() {
  return useQuery({
    ...connectionsQueryOptions(),
    retry: false,
    select: response => response.data,
  });
}

export function useCreateConnection() {
  const queryClient = useQueryClient();
  const mutation = api.useMutation("post", "/admin/api/v1/connections", {
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: connectionsQueryOptions().queryKey,
      });
    },
  });

  return {
    ...mutation,
    create: (input: CreateConnectionInput) => mutation.mutateAsync({ body: input }),
  };
}
