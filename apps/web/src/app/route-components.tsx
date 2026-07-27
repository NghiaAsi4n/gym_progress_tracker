import { useQuery } from "@tanstack/react-query";
import { Link, Outlet } from "react-router-dom";

import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { LanguageSwitcher } from "../features/preferences/LanguageSwitcher.js";
import { ThemeSwitcher } from "../features/preferences/theme.js";
import { useI18n } from "../i18n/i18n-context.js";
import { getHealth } from "../services/api-client.js";
import { useAuth } from "../features/auth/AuthProvider.js";
import { UnitSwitcher } from "../features/preferences/unit.js";

export function AppShell() {
  const { t } = useI18n();
  const { status, user, signOut } = useAuth();

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-primary">
          <Link className="brand" to="/">
            <span aria-hidden="true" className="brand-mark">
              Ω
            </span>
            <span>{t("common", "brandName")}</span>
          </Link>
          <nav aria-label={t("common", "navigationLabel")}>
            <Link aria-current="page" to="/">
              {t("common", "overview")}
            </Link>
            {status === "authenticated" ? (
              <>
                <Link to="/exercises">Exercises</Link>
                <Link to="/templates">Templates</Link>
                <Link to="/training-plans">Plan</Link>
                <Link to="/workouts/active">Workout</Link>
                <Link to="/workouts/history">History</Link>
                <button className="text-button" onClick={() => void signOut()} type="button">
                  {t("auth", "logoutAction")}
                </button>
              </>
            ) : (
              <Link to="/auth/login">{t("auth", "loginAction")}</Link>
            )}
          </nav>
        </div>
        <div className="preference-controls">
          <LanguageSwitcher />
          <UnitSwitcher label="Unit" />
          <ThemeSwitcher
            groupLabel={t("common", "themeGroupLabel")}
            labels={{
              light: t("common", "themeLight"),
              dark: t("common", "themeDark"),
              system: t("common", "themeSystem"),
            }}
          />
        </div>
      </header>
      <Outlet />
      {user ? (
        <p className="account-indicator">
          {t("auth", "accountLabel")} {user.email}
        </p>
      ) : null}
      <footer className="site-footer">
        <small>{t("common", "footer")}</small>
      </footer>
    </div>
  );
}

export function HomePage() {
  const { t } = useI18n();
  const health = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => getHealth(signal),
  });

  return (
    <main className="page">
      <Card aria-labelledby="page-title" className="intro-panel" emphasis>
        <p className="eyebrow">{t("common", "heroEyebrow")}</p>
        <h1 id="page-title">{t("common", "heroTitle")}</h1>
        <p className="lede">{t("common", "heroDescription")}</p>
      </Card>

      <Card aria-labelledby="system-status-title" className="status-panel">
        <div>
          <p className="eyebrow">{t("common", "systemStatusEyebrow")}</p>
          <h2 id="system-status-title">{t("common", "serviceConnection")}</h2>
        </div>

        {health.isPending ? (
          <p aria-live="polite">{t("common", "healthChecking")}</p>
        ) : health.isError ? (
          <div role="alert">
            <p>{t("common", "healthError")}</p>
            <Button onClick={() => void health.refetch()} variant="secondary">
              {t("common", "healthRetry")}
            </Button>
          </div>
        ) : (
          <p className="success-status" role="status">
            <span aria-hidden="true">●</span> {t("common", "healthReady")}
          </p>
        )}
      </Card>
    </main>
  );
}

export function NotFoundPage() {
  const { t } = useI18n();

  return (
    <main className="centered-state">
      <p className="eyebrow">404</p>
      <h1>{t("common", "notFoundTitle")}</h1>
      <p>{t("common", "notFoundDescription")}</p>
      <Link className="button" to="/">
        {t("common", "notFoundHome")}
      </Link>
    </main>
  );
}
