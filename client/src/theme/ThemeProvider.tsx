import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { themeConfig, type ThemeMode } from "./theme";
import { ThemeContext, type ThemeContextValue } from "./ThemeContext";

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(mode: ThemeMode): "dark" | "light" {
  if (mode === "system") return getSystemTheme();
  return mode;
}

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return themeConfig.defaultMode;
  try {
    const stored = window.localStorage.getItem(themeConfig.storageKey);
    if (stored === "dark" || stored === "light" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
  }
  return themeConfig.defaultMode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode);
  const [systemTheme, setSystemTheme] = useState<"dark" | "light">(getSystemTheme);

  const resolved = useMemo(
    () => (mode === "system" ? systemTheme : resolveTheme(mode)),
    [mode, systemTheme],
  );

  // Reflect resolved theme onto <html> as data-theme attribute.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", resolved);
    root.style.colorScheme = resolved;
  }, [resolved]);

  // Persist mode preference.
  useEffect(() => {
    try {
      window.localStorage.setItem(themeConfig.storageKey, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  // Listen for system theme changes while in "system" mode.
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };
    setSystemTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      if (prev === "dark") return "light";
      if (prev === "light") return "dark";
      // system → explicit opposite of current resolved
      return getSystemTheme() === "dark" ? "light" : "dark";
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved, setMode, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// Re-export the context so consumers can import from a single path.
export { ThemeContext as ThemeProviderContext };
