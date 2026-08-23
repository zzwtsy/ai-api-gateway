import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useIsMobile } from "./use-mobile";

describe("useIsMobile", () => {
  let listeners: Set<EventListener>;
  let addEventListener: ReturnType<typeof vi.fn>;
  let removeEventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listeners = new Set();
    addEventListener = vi.fn((_type: string, listener: EventListener) => {
      listeners.add(listener);
    });
    removeEventListener = vi.fn((_type: string, listener: EventListener) => {
      listeners.delete(listener);
    });
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: false,
      addEventListener,
      removeEventListener,
    }));
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1024,
      writable: true,
    });
  });

  it("tracks the 768px breakpoint and removes its listener on unmount", () => {
    const { result, unmount } = renderHook(() => useIsMobile());

    expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 767px)");
    expect(result.current).toBe(false);

    act(() => {
      window.innerWidth = 767;
      for (const listener of listeners) {
        listener(new Event("change"));
      }
    });

    expect(result.current).toBe(true);
    unmount();
    expect(removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(listeners.size).toBe(0);
  });
});
