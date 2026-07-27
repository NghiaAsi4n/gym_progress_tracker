import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./AuthProvider.js";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") {
    return (
      <p className="centered-state" role="status">
        Restoring your session…
      </p>
    );
  }
  if (auth.status === "anonymous") {
    return <Navigate replace state={{ from: location.pathname }} to="/auth/login" />;
  }
  return children;
}
