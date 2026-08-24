import type { operations } from "@/api/schema";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-runtime/client";

export type CreateGatewayClientInput
  = operations["createGatewayClient"]["requestBody"]["content"]["application/json"];

function clientsQueryOptions() {
  return api.queryOptions("get", "/admin/api/v1/clients");
}

export function useHarnessProfiles() {
  return useQuery({
    ...api.queryOptions("get", "/admin/api/v1/harness-profiles"),
    retry: false,
    select: response => response.data,
  });
}

export function useGatewayClients() {
  return useQuery({
    ...clientsQueryOptions(),
    retry: false,
    select: response => response.data,
  });
}

export function useCreateGatewayClient() {
  const queryClient = useQueryClient();
  const mutation = api.useMutation("post", "/admin/api/v1/clients", {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clientsQueryOptions().queryKey });
    },
  });

  return {
    ...mutation,
    create: async (input: CreateGatewayClientInput) => {
      const response = await mutation.mutateAsync({ body: input });
      mutation.reset();
      return response.data;
    },
  };
}

export function useRotateGatewayClientKey() {
  const queryClient = useQueryClient();
  const mutation = api.useMutation("post", "/admin/api/v1/clients/{clientId}/keys/rotate", {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clientsQueryOptions().queryKey });
    },
  });

  return {
    ...mutation,
    rotate: async (clientId: string, overlapHours = 24) => {
      const response = await mutation.mutateAsync({
        params: { path: { clientId } },
        body: { overlapHours },
      });
      mutation.reset();
      return response.data;
    },
  };
}

export function useRevokeGatewayClientKey() {
  const queryClient = useQueryClient();
  const mutation = api.useMutation("post", "/admin/api/v1/client-keys/{keyId}/revoke", {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clientsQueryOptions().queryKey });
    },
  });

  return {
    ...mutation,
    revoke: (keyId: string) => mutation.mutateAsync({ params: { path: { keyId } } }),
  };
}
