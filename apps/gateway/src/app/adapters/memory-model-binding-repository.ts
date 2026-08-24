import type { ModelBindingRepository, ProviderModelBindingRecord } from "../../control-plane/features/models/contracts.js";
import { AppError } from "../../core/errors/app-error.js";

export class MemoryModelBindingRepository implements ModelBindingRepository {
  readonly #items = new Map<string, ProviderModelBindingRecord>();
  public constructor(private readonly hasEndpoint: (endpointId: string) => Promise<boolean>) {}
  public async list() { return [...this.#items.values()]; }
  public endpointExists(endpointId: string) { return this.hasEndpoint(endpointId); }
  public async create(record: ProviderModelBindingRecord) {
    if ([...this.#items.values()].some(item => item.endpointId === record.endpointId && item.upstreamModelId === record.upstreamModelId))
      throw new AppError("MODEL_BINDING_CONFLICT");
    this.#items.set(record.id, record);
    return record;
  }
}
