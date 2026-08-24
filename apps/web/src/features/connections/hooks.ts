import type { operations } from "@/api/schema";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-runtime/client";

export type CreateConnectionInput
  = operations["createConnection"]["requestBody"]["content"]["application/json"];
export type AddConnectionEndpointInput
  = operations["addConnectionEndpoint"]["requestBody"]["content"]["application/json"];
export type RotateProviderCredentialInput
  = operations["rotateProviderCredential"]["requestBody"]["content"]["application/json"];
export type StartCompatibilityProbeInput
  = operations["probeEndpoint"]["requestBody"]["content"]["application/json"];

function connectionsQueryOptions() {
  return api.queryOptions("get", "/admin/api/v1/connections");
}

function connectionCompatibilityQueryOptions(connectionId: string) {
  return api.queryOptions("get", "/admin/api/v1/connections/{connectionId}/compatibility", {
    params: { path: { connectionId } },
  });
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
    create: async (input: CreateConnectionInput) => {
      const response = await mutation.mutateAsync({ body: input });
      return response.data;
    },
  };
}

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
