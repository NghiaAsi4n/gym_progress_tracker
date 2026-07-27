import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { Button } from "../../components/ui/Button.js";
import { Card } from "../../components/ui/Card.js";
import { useI18n } from "../../i18n/i18n-context.js";
import { ApiClientError } from "../../services/api-auth.js";
import { useAuth } from "./AuthProvider.js";

interface AuthPageProps {
  mode: "login" | "register";
}

export function AuthPage({ mode }: AuthPageProps) {
  const { t } = useI18n();
  const { status, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";

  if (status === "authenticated") {
    return <Navigate replace to={(location.state as { from?: string } | null)?.from ?? "/"} />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const normalizedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError(t("auth", "emailInvalid"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth", "passwordInvalid"));
      return;
    }
    setSubmitting(true);
    try {
      if (isRegister) await signUp(normalizedEmail, password);
      else await signIn(normalizedEmail, password);
      void navigate("/", { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError ? requestError.message : t("auth", "requestFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="centered-state auth-page">
      <Card aria-labelledby="auth-title" className="auth-card" emphasis>
        <p className="eyebrow">{t("common", "brandName")}</p>
        <h1 id="auth-title">{t("auth", isRegister ? "registerTitle" : "loginTitle")}</h1>
        <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
          <label>
            {t("auth", "emailLabel")}
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            {t("auth", "passwordLabel")}
            <input
              autoComplete={isRegister ? "new-password" : "current-password"}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button disabled={submitting} type="submit">
            {t("auth", isRegister ? "registerAction" : "loginAction")}
          </Button>
        </form>
        <Link to={isRegister ? "/auth/login" : "/auth/register"}>
          {t("auth", isRegister ? "switchToLogin" : "switchToRegister")}
        </Link>
      </Card>
    </main>
  );
}
