import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  parseThemePreference,
  resolveEffectiveTheme,
  themeStorageKey,
  useTheme,
} from "./theme";
import { ThemeProvider } from "./theme-provider";

describe("theme provider", () => {
  let systemDark = false;
  let mediaListener: ((event: MediaQueryListEvent) => void) | undefined;

  beforeEach(() => {
    systemDark = false;
    mediaListener = undefined;
    window.localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-preference");
    document.head.innerHTML = "<meta name=\"theme-color\" content=\"#ffffff\">";
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({
      get matches() {
        return systemDark;
      },
      addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
        mediaListener = listener;
      },
      removeEventListener: vi.fn(),
    })));
  });

  it("normalizes invalid preferences and resolves system theme", () => {
    expect(parseThemePreference("sepia")).toBe("system");
    expect(parseThemePreference(null)).toBe("system");
    expect(resolveEffectiveTheme("system", "dark")).toBe("dark");
    expect(resolveEffectiveTheme("light", "dark")).toBe("light");
  });

  it("persists an explicit preference and applies all derived DOM state", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    await user.click(screen.getByRole("button", { name: "使用深色" }));

    expect(window.localStorage.getItem(themeStorageKey)).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).not.toHaveClass("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement).toHaveAttribute("data-theme-preference", "dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.querySelector("meta[name=\"theme-color\"]")).toHaveAttribute("content", "#171717");
  });

  it("responds to system changes only through the system preference", () => {
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    systemDark = true;
    act(() => mediaListener?.({ matches: true } as MediaQueryListEvent));

    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByTestId("theme-state")).toHaveTextContent("system/dark");
  });

  it("synchronizes a valid preference from another tab", () => {
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", {
        key: themeStorageKey,
        newValue: "dark",
      }));
    });

    expect(screen.getByTestId("theme-state")).toHaveTextContent("dark/dark");
    expect(document.documentElement).toHaveClass("dark");
  });
});

function ThemeProbe() {
  const { effectiveTheme, preference, setPreference } = useTheme();
  return (
    <div>
      <span data-testid="theme-state">
        {preference}
        /
        {effectiveTheme}
      </span>
      <button type="button" onClick={() => setPreference("dark")}>使用深色</button>
    </div>
  );
}
