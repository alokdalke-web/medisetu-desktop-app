import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "medisetu-theme";
type Theme = "light" | "dark";

// Simple pub/sub so multiple components stay in sync
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* SSR or private mode */
  }
  return "light";
}

function applyThemeToDOM(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

// Apply initial theme on load
applyThemeToDOM(getTheme());

function setTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  applyThemeToDOM(theme);
  notify();
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getTheme,
    () => "light" as Theme,
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme]);

  const isDark = theme === "dark";

  return { theme, isDark, toggleTheme } as const;
}
