import { Link } from "react-router-dom";

import { useI18n } from "../../i18n/i18n-context.js";

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