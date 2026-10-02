import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "tc-user-theme";

function readStoredTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
    document.documentElement.dataset.userTheme = theme;
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      isLight: theme === "light",
      setTheme: (next) => {
        if (next === "light" || next === "dark") setThemeState(next);
      },
      toggleTheme: () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme phải dùng trong ThemeProvider");
  }
  return ctx;
}
