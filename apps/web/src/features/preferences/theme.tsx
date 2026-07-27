import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { usePrefersDarkTheme } from "./media-preferences.js";
import {
  ThemeContext,
  useTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme-context.js";
import { readStoredTheme, storeTheme } from "./theme-storage.js";

interface ThemeProviderProps {
  children: ReactNode;
}

interface ThemeSwitcherProps {
  groupLabel: string;
  labels: Record<ThemePreference, string>;
}

const themeOptions: ThemePreference[] = ["light", "dark", "system"];

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredTheme);
  const prefersDark = usePrefersDarkTheme();
  const resolvedTheme: ResolvedTheme =
    preference === "system" ? (prefersDark ? "dark" : "light") : preference;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.themePreference = preference;
    root.style.colorScheme = resolvedTheme;
  }, [preference, resolvedTheme]);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    storeTheme(nextPreference);
    setPreferenceState(nextPreference);
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function ThemeSwitcher({ groupLabel, labels }: ThemeSwitcherProps) {
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className="segmented-control">
      <legend className="sr-only">{groupLabel}</legend>
      {themeOptions.map((option) => (
        <label key={option}>
          <input
            checked={preference === option}
            name="theme-preference"
            onChange={() => {
              setPreference(option);
            }}
            type="radio"
            value={option}
          />
          <span>{labels[option]}</span>
        </label>
      ))}
    </fieldset>
  );
}
