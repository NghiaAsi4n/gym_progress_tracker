import { useEffect, useRef, type ReactNode } from "react";

import { updatePreferences } from "../../services/api-auth.js";
import { useI18n } from "../../i18n/i18n-context.js";
import { useAuth } from "../auth/AuthProvider.js";
import { useTheme } from "./theme-context.js";
import { useUnit } from "./unit.js";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { status, user, setUser } = useAuth();
  const { locale, setLocale } = useI18n();
  const { preference: theme, setPreference: setTheme } = useTheme();
  const { unit, setUnit } = useUnit();
  const appliedUserId = useRef<string | null>(null);
  const syncing = useRef(false);
  const suppressNextSync = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !user || appliedUserId.current === user.id) return;
    appliedUserId.current = user.id;
    suppressNextSync.current = true;
    setLocale(user.preferences.locale);
    setTheme(user.preferences.theme.toLowerCase() as "light" | "dark" | "system");
    setUnit(user.preferences.unit);
  }, [setLocale, setTheme, setUnit, status, user]);

  useEffect(() => {
    if (status !== "authenticated" || !user || appliedUserId.current !== user.id || syncing.current)
      return;
    if (suppressNextSync.current) {
      suppressNextSync.current = false;
      return;
    }
    const next = { locale, theme: theme.toUpperCase() as "LIGHT" | "DARK" | "SYSTEM", unit };
    if (
      next.locale === user.preferences.locale &&
      next.theme === user.preferences.theme &&
      next.unit === user.preferences.unit
    )
      return;
    syncing.current = true;
    void updatePreferences(next)
      .then((response) => setUser(response.data.user))
      .finally(() => {
        syncing.current = false;
      });
  }, [locale, setUser, status, theme, unit, user]);

  useEffect(() => {
    if (status !== "authenticated") {
      appliedUserId.current = null;
      suppressNextSync.current = false;
    }
  }, [status]);

  return children;
}
