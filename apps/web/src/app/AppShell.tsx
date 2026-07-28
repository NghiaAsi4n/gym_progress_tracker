import { Link, NavLink, Outlet } from "react-router-dom";

import { Button } from "../components/ui/Button.js";
import { LanguageSwitcher } from "../features/preferences/LanguageSwitcher.js";
import { ThemeSwitcher } from "../features/preferences/theme.js";
import { useI18n } from "../i18n/i18n-context.js";
import { useAuth } from "../features/auth/AuthProvider.js";
import { UnitSwitcher } from "../features/preferences/unit.js";
import {
  IconAmphora,
  IconGate,
  IconLaurel,
  IconLightning,
  IconScroll,
  IconSun,
} from "../components/icons/GreekIcons.js";

export function AppShell() {
  const { t } = useI18n();
  const { status, user, signOut } = useAuth();

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t("common", "skipToContent")}
      </a>
      <header className="site-header">
        <div className="header-topbar">
          <Link className="brand" to="/">
            <span aria-hidden="true" className="brand-mark">
              Ω
            </span>
            <span>{t("common", "brandName")}</span>
          </Link>
          <div className="header-tools">
            <div className="preference-controls">
              <LanguageSwitcher />
              <UnitSwitcher label={t("common", "unitLabel")} />
              <ThemeSwitcher
                groupLabel={t("common", "themeGroupLabel")}
                labels={{
                  light: t("common", "themeLight"),
                  dark: t("common", "themeDark"),
                  system: t("common", "themeSystem"),
                }}
              />
            </div>
            {status === "authenticated" && user ? (
              <div
                aria-label={t("auth", "accountControlsLabel")}
                className="account-controls"
                role="group"
              >
                <div className="account-summary">
                  <span aria-hidden="true" className="account-avatar">
                    <IconLaurel />
                  </span>
                  <span className="account-copy">
                    <span>{t("auth", "accountLabel")}</span>
                    <strong title={user.email}>{user.email}</strong>
                  </span>
                </div>
                <Button
                  className="sign-out-button"
                  onClick={() => void signOut()}
                  variant="secondary"
                >
                  {t("auth", "logoutAction")}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="header-navigation">
          <nav aria-label={t("common", "navigationLabel")}>
            <NavLink end to="/">
              <IconSun className="nav-icon" />
              {t("common", "overview")}
            </NavLink>
            {status === "authenticated" ? (
              <>
                <NavLink to="/exercises">
                  <IconAmphora className="nav-icon" />
                  {t("common", "navExercises")}
                </NavLink>
                <NavLink to="/templates">
                  <IconScroll className="nav-icon" />
                  {t("common", "navTemplates")}
                </NavLink>
                <NavLink to="/workouts/active">
                  <IconLightning className="nav-icon" />
                  {t("common", "navWorkout")}
                </NavLink>
                <NavLink to="/workouts/history">
                  <IconScroll className="nav-icon" />
                  {t("common", "navHistory")}
                </NavLink>
                <NavLink to="/progress">
                  <IconLaurel className="nav-icon" />
                  {t("common", "navProgress")}
                </NavLink>
              </>
            ) : (
              <NavLink to="/auth/login">
                <IconGate className="nav-icon" />
                {t("auth", "loginAction")}
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <div id="main-content" tabIndex={-1}>
        <Outlet />
      </div>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/">
              <span aria-hidden="true" className="brand-mark">
                Ω
              </span>
              <strong>{t("common", "brandName")}</strong>
            </Link>
            <p>{t("common", "footerTagline")}</p>
          </div>
          <nav aria-label={t("common", "footerNavigationLabel")} className="footer-links">
            <Link to="/">{t("common", "overview")}</Link>
            {status === "authenticated" ? (
              <>
                <Link to="/workouts/active">{t("common", "navWorkout")}</Link>
                <Link to="/progress">{t("common", "navProgress")}</Link>
              </>
            ) : (
              <Link to="/auth/login">{t("auth", "loginAction")}</Link>
            )}
          </nav>
        </div>
        <div className="footer-meta">
          <small>
            © {new Date().getFullYear()} {t("common", "brandName")}. {t("common", "copyrightLabel")}
          </small>
          <small>{t("common", "footerAccountNote")}</small>
        </div>
      </footer>
    </div>
  );
}
