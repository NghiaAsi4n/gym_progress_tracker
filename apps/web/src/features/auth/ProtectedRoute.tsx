import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useI18n } from "../../i18n/i18n-context.js";
import { useAuth } from "./AuthProvider.js";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") {
    return (
      <p className="centered-state" role="status">
        {t("common", "restoringSession")}
      </p>
    );
  }
  if (auth.status === "anonymous") {
    return <Navigate replace state={{ from: location.pathname }} to="/auth/login" />;
  }
  return children;
}
