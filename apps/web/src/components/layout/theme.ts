import { createContext, use } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type EffectiveTheme = "light" | "dark";

export const themeStorageKey = "aigw_theme";

export interface ThemeContextValue {
  readonly effectiveTheme: EffectiveTheme;
  readonly preference: ThemePreference;
  readonly setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const value = use(ThemeContext);
  if (value === null)
    throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}

export function parseThemePreference(value: string | null): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function resolveEffectiveTheme(
  preference: ThemePreference,
  systemTheme: EffectiveTheme,
): EffectiveTheme {
  return preference === "system" ? systemTheme : preference;
}
