import type { ReactNode } from "react";

import type { EffectiveTheme, ThemeContextValue, ThemePreference } from "./theme";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";

import {
  parseThemePreference,
  resolveEffectiveTheme,
  ThemeContext,
  themeStorageKey,
} from "./theme";

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(readStoredThemePreference);
  const [systemTheme, setSystemTheme] = useState<EffectiveTheme>(readSystemTheme);
  const effectiveTheme = resolveEffectiveTheme(preference, systemTheme);

  useLayoutEffect(() => {
    applyEffectiveTheme(effectiveTheme, preference);
  }, [effectiveTheme, preference]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === themeStorageKey || event.key === null)
        setPreference(parseThemePreference(event.newValue));
    };

    media.addEventListener("change", handleSystemChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      media.removeEventListener("change", handleSystemChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    effectiveTheme,
    preference,
    setPreference: (nextPreference) => {
      window.localStorage.setItem(themeStorageKey, nextPreference);
      setPreference(nextPreference);
    },
  }), [effectiveTheme, preference]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined")
    return "system";
  try {
    return parseThemePreference(window.localStorage.getItem(themeStorageKey));
  } catch {
    return "system";
  }
}

function readSystemTheme(): EffectiveTheme {
  if (typeof window === "undefined")
    return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyEffectiveTheme(theme: EffectiveTheme, preference: ThemePreference): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.dataset.theme = theme;
  root.dataset.themePreference = preference;
  root.style.colorScheme = theme;
  document.querySelector<HTMLMetaElement>("meta[name=\"theme-color\"]")
    ?.setAttribute("content", theme === "dark" ? "#171717" : "#ffffff");
}
