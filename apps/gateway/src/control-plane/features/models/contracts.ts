export interface ProviderModelBindingRecord {
  readonly id: string;
  readonly endpointId: string;
  readonly upstreamModelId: string;
  readonly name: string;
  readonly status: "unverified" | "available" | "deprecated" | "unavailable";
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ModelBindingRepository {
  list: () => Promise<readonly ProviderModelBindingRecord[]>;
  endpointExists: (endpointId: string) => Promise<boolean>;
  create: (record: ProviderModelBindingRecord) => Promise<ProviderModelBindingRecord>;
}
