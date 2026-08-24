import type { Clock } from "../../../core/time/clock.js";
import type { ModelBindingRepository } from "./contracts.js";
import { randomUUID } from "node:crypto";
import { AppError } from "../../../core/errors/app-error.js";

export class ModelBindingService {
  public constructor(private readonly repository: ModelBindingRepository, private readonly clock: Clock) {}
  public list() { return this.repository.list(); }
  public async create(input: { endpointId: string; upstreamModelId: string; name: string }) {
    if (!(await this.repository.endpointExists(input.endpointId)))
      throw new AppError("MODEL_ENDPOINT_NOT_FOUND");
    const now = this.clock.now();
    return this.repository.create({ id: randomUUID(), ...input, status: "unverified", createdAt: now, updatedAt: now });
  }
}
