import { describe, expect, it } from "vitest";

import { MemoryModelBindingRepository } from "../../../app/adapters/memory-model-binding-repository.js";
import { ModelBindingService } from "./service.js";

describe("ModelBindingService", () => {
  it("rejects an unknown Endpoint with a stable error before persistence", async () => {
    const repository = new MemoryModelBindingRepository(async () => false);
    const service = new ModelBindingService(repository, { now: () => new Date("2026-08-24T00:00:00.000Z") });

    await expect(service.create({ endpointId: "missing", upstreamModelId: "model", name: "Model" }))
      .rejects
      .toEqual(expect.objectContaining({ code: "MODEL_ENDPOINT_NOT_FOUND" }));
    expect(await repository.list()).toEqual([]);
  });
});
