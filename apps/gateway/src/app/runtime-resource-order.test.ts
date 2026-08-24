import { describe, expect, it, vi } from "vitest";

import { closeRuntimeResources } from "./runtime-resource-order.js";

describe("closeRuntimeResources", () => {
  it("settles background probes before closing their transport and storage", async () => {
    const order: string[] = [];
    const stopBackgroundTasks = vi.fn(async () => {
      order.push("background");
    });
    const closeTransport = vi.fn(async () => {
      order.push("transport");
    });
    const closeStorage = vi.fn(async () => {
      order.push("storage");
    });

    await closeRuntimeResources({ stopBackgroundTasks, closeTransport, closeStorage });

    expect(order).toEqual(["background", "transport", "storage"]);
    expect(stopBackgroundTasks).toHaveBeenCalledOnce();
    expect(closeTransport).toHaveBeenCalledOnce();
    expect(closeStorage).toHaveBeenCalledOnce();
  });
});
