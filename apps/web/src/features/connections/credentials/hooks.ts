import type { operations } from "@/api/schema";

import { useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-runtime/client";

import { connectionsQueryOptions } from "../shared/query-options";

export type RotateProviderCredentialInput
  = operations["rotateProviderCredential"]["requestBody"]["content"]["application/json"];

export function useRotateProviderCredential() {
  const queryClient = useQueryClient();
  const mutation = api.useMutation("post", "/admin/api/v1/provider-credentials/{credentialId}/rotate", {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: connectionsQueryOptions().queryKey });
    },
  });

  return {
    ...mutation,
    rotate: (credentialId: string, input: RotateProviderCredentialInput) => mutation.mutateAsync({
      params: { path: { credentialId } },
      body: input,
    }),
  };
}

export function useDisableProviderCredential() {
  const queryClient = useQueryClient();
  const mutation = api.useMutation("post", "/admin/api/v1/provider-credentials/{credentialId}/disable", {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: connectionsQueryOptions().queryKey });
    },
  });

  return {
    ...mutation,
    disable: (credentialId: string) => mutation.mutateAsync({ params: { path: { credentialId } } }),
  };
}

export function useProbeProviderCredential() {
  const queryClient = useQueryClient();
  const mutation = api.useMutation("post", "/admin/api/v1/provider-credentials/{credentialId}/probe", {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: connectionsQueryOptions().queryKey });
    },
  });

  return {
    ...mutation,
    probe: async (credentialId: string, input: { endpointId: string; model: string }) => {
      const response = await mutation.mutateAsync({
        params: { path: { credentialId } },
        body: input,
      });
      return response.data;
    },
  };
}
