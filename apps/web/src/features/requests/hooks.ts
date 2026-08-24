import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-runtime/client";

export function useRequests() {
  return useQuery({
    ...api.queryOptions("get", "/admin/api/v1/requests", {
      params: { query: { limit: 50 } },
    }),
    retry: false,
    refetchInterval: 5_000,
    select: response => response.data,
  });
}

export function useRequest(id: string | undefined) {
  const requestId = id ?? "__disabled__";
  return useQuery({
    ...api.queryOptions("get", "/admin/api/v1/requests/{requestId}", {
      params: { path: { requestId } },
    }),
    enabled: id !== undefined,
    retry: false,
    select: response => response.data,
  });
}
