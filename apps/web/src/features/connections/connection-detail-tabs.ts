const CONNECTION_DETAIL_TABS = [
  "overview",
  "endpoints",
  "accounts",
  "models",
  "compatibility",
] as const;

export type ConnectionDetailTab = (typeof CONNECTION_DETAIL_TABS)[number];

const DEFAULT_CONNECTION_DETAIL_TAB: ConnectionDetailTab = "overview";

const connectionDetailTabSet = new Set<string>(CONNECTION_DETAIL_TABS);

export function isConnectionDetailTab(value: unknown): value is ConnectionDetailTab {
  return typeof value === "string" && connectionDetailTabSet.has(value);
}

export function resolveConnectionDetailTab(value: string | undefined): ConnectionDetailTab {
  return isConnectionDetailTab(value) ? value : DEFAULT_CONNECTION_DETAIL_TAB;
}

export function toConnectionDetailTabSearch(tab: ConnectionDetailTab): string | undefined {
  return tab === DEFAULT_CONNECTION_DETAIL_TAB ? undefined : tab;
}
