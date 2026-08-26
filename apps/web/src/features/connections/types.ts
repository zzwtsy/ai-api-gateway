import type { components } from "@/api/schema";

type ModelBinding = components["schemas"]["ProviderModelBinding"];

export interface ConnectionModelBindingsState {
  readonly data: readonly ModelBinding[] | undefined;
  readonly error: unknown;
  readonly loading: boolean;
  readonly onRetry: () => Promise<unknown>;
  readonly stale: boolean;
}
