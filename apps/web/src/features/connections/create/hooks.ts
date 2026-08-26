import type { operations } from "@/api/schema";

import { useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-runtime/client";

import { connectionsQueryOptions } from "../shared/query-options";

export type CreateConnectionInput
  = operations["createConnection"]["requestBody"]["content"]["application/json"];

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
    create: async (input: CreateConnectionInput) => {
      const response = await mutation.mutateAsync({ body: input });
      return response.data;
    },
  };
}
