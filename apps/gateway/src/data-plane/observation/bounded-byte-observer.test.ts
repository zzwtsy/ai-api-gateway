import { describe, expect, it } from "vitest";

import { BoundedByteObserver } from "./bounded-byte-observer.js";

describe("BoundedByteObserver", () => {
  it("observes queued chunks without changing their bytes", async () => {
    const received: number[] = [];
    const observer = new BoundedByteObserver(32, (chunk) => {
      received.push(...chunk);
    });
    const now = new Date("2026-08-22T00:00:00.000Z");
    expect(observer.tryWrite(Uint8Array.from([1, 2]), now)).toBe(true);
    expect(observer.tryWrite(Uint8Array.from([3]), now)).toBe(true);
    await expect(observer.finish()).resolves.toEqual({
      status: "complete",
      observedBytes: 3,
      firstByteAt: now,
    });
    expect(received).toEqual([1, 2, 3]);
  });

  it("marks observation incomplete rather than backpressuring when the bound is exceeded", async () => {
    let release: (() => void) | undefined;
    const blocker = new Promise<void>((resolve) => {
      release = resolve;
    });
    const observer = new BoundedByteObserver(4, async () => blocker);
    const now = new Date();
    expect(observer.tryWrite(Uint8Array.from([1, 2, 3]), now)).toBe(true);
    expect(observer.tryWrite(Uint8Array.from([4, 5, 6]), now)).toBe(false);
    release?.();
    await expect(observer.finish()).resolves.toMatchObject({ status: "incomplete" });
  });
});
