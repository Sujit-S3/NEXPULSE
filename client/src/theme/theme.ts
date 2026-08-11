export type ThemeMode = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

const STORAGE_KEY = "nexpulse-theme";

export const themeConfig = {
  storageKey: STORAGE_KEY,
  defaultMode: "system" as ThemeMode,
  defaultResolved: "dark" as ResolvedTheme,
};
