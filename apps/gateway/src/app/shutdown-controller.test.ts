import { describe, expect, it, vi } from "vitest";

import { ShutdownController } from "./shutdown-controller.js";

describe("ShutdownController", () => {
  it("coalesces concurrent signals and reaches quiescence in ownership order", async () => {
    const order: string[] = [];
    let releaseStop: (() => void) | undefined;
    const stopAccepting = vi.fn(async () => {
      order.push("stop:start");
      await new Promise<void>((resolve) => { releaseStop = resolve; });
      order.push("stop:end");
    });
    const closeResources = vi.fn(async () => { order.push("resources:closed"); });
    const controller = new ShutdownController({ stopAccepting, closeResources });

    const first = controller.shutdown();
    const second = controller.shutdown();
    expect(first).toBe(second);
    expect(closeResources).not.toHaveBeenCalled();
    releaseStop?.();
    await Promise.all([first, second]);

    expect(stopAccepting).toHaveBeenCalledTimes(1);
    expect(closeResources).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["stop:start", "stop:end", "resources:closed"]);
  });
});
