import { useQuery } from "@tanstack/react-query";

import { connectionsQueryOptions } from "./query-options";

export function useConnections() {
  return useQuery({
    ...connectionsQueryOptions(),
    retry: false,
    select: response => response.data,
  });
}
