import type { QueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-runtime/client";

export function connectionsQueryOptions() {
  return api.queryOptions("get", "/admin/api/v1/connections");
}

export function connectionCompatibilityQueryOptions(connectionId: string) {
  return api.queryOptions("get", "/admin/api/v1/connections/{connectionId}/compatibility", {
    params: { path: { connectionId } },
  });
}

export function connectionDeletionImpactQueryOptions(connectionId: string) {
  return api.queryOptions("get", "/admin/api/v1/connections/{connectionId}/deletion-impact", {
    params: { path: { connectionId } },
  });
}

export function endpointDeletionImpactQueryOptions(endpointId: string) {
  return api.queryOptions("get", "/admin/api/v1/endpoints/{endpointId}/deletion-impact", {
    params: { path: { endpointId } },
  });
}

function modelBindingsQueryOptions() {
  return api.queryOptions("get", "/admin/api/v1/models");
}

export async function invalidateEndpointDependencies(queryClient: QueryClient, connectionId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: connectionsQueryOptions().queryKey }),
    queryClient.invalidateQueries({ queryKey: connectionCompatibilityQueryOptions(connectionId).queryKey }),
    queryClient.invalidateQueries({ queryKey: modelBindingsQueryOptions().queryKey }),
  ]);
}

export async function invalidateDeletedConnectionDependencies(queryClient: QueryClient, connectionId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: connectionsQueryOptions().queryKey }),
    queryClient.invalidateQueries({ queryKey: modelBindingsQueryOptions().queryKey }),
  ]);
  queryClient.removeQueries({ queryKey: connectionCompatibilityQueryOptions(connectionId).queryKey });
  queryClient.removeQueries({ queryKey: connectionDeletionImpactQueryOptions(connectionId).queryKey });
}
