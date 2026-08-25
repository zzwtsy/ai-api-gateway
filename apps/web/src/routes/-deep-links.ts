import type { ConnectionDetailTab } from "@/features/connections/connection-detail-tabs";

import { toConnectionDetailTabSearch } from "@/features/connections/connection-detail-tabs";

export function connectionDeepLink(
  connectionId?: string,
  tab?: ConnectionDetailTab,
) {
  return {
    to: "/connections" as const,
    search: {
      ...(connectionId === undefined ? {} : { connectionId }),
      ...(tab === undefined ? {} : { tab: toConnectionDetailTabSearch(tab) }),
    },
  };
}
