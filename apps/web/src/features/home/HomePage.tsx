import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import {
  IconEye,
  IconLaurel,
  IconLightning,
  IconScroll,
} from "../../components/icons/GreekIcons.js";
import { Button } from "../../components/ui/Button.js";
import { Card } from "../../components/ui/Card.js";
import { useI18n } from "../../i18n/i18n-context.js";
import { getHealth } from "../../services/api-client.js";

export function HomePage() {
  const { t } = useI18n();
  const health = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => getHealth(signal),
  });

  return (
    <main className="home-page">
      <section aria-labelledby="page-title" className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">
            <IconLaurel className="eyebrow-icon" />
            {t("common", "heroEyebrow")}
          </p>
          <h1 id="page-title">{t("common", "heroTitle")}</h1>
          <p className="home-lede">{t("common", "heroDescription")}</p>
          <div className="home-hero-actions">
            <Link className="button button-primary" to="/workouts/active">
              <IconLightning />
              {t("common", "startWorkoutAction")}
            </Link>
            <Link className="home-text-link" to="/exercises">
              {t("common", "browseExercisesAction")}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <Card aria-labelledby="system-status-title" className="home-status-card">
          <div className="home-status-heading">
            <span aria-hidden="true" className="home-status-icon">
              <IconEye />
            </span>
            <div>
              <p className="eyebrow">{t("common", "systemStatusEyebrow")}</p>
              <h2 id="system-status-title">{t("common", "serviceConnection")}</h2>
            </div>
          </div>

          <div className="home-status-result">
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
          </div>
        </Card>
      </section>

      <section aria-labelledby="toolkit-title" className="home-toolkit">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">{t("common", "toolkitEyebrow")}</p>
            <h2 id="toolkit-title">{t("common", "toolkitTitle")}</h2>
          </div>
          <p>{t("common", "toolkitDescription")}</p>
        </div>

        <div className="home-toolkit-grid">
          <Link className="home-tool-card" to="/templates">
            <span className="home-tool-number">01</span>
            <IconScroll className="home-tool-icon" />
            <h3>{t("common", "toolkitPlanTitle")}</h3>
            <p>{t("common", "toolkitPlanDescription")}</p>
            <span className="home-tool-link">
              {t("common", "toolkitOpenAction")} <span aria-hidden="true">↗</span>
            </span>
          </Link>
          <Link className="home-tool-card" to="/workouts/active">
            <span className="home-tool-number">02</span>
            <IconLightning className="home-tool-icon" />
            <h3>{t("common", "toolkitWorkoutTitle")}</h3>
            <p>{t("common", "toolkitWorkoutDescription")}</p>
            <span className="home-tool-link">
              {t("common", "toolkitOpenAction")} <span aria-hidden="true">↗</span>
            </span>
          </Link>
          <Link className="home-tool-card" to="/progress">
            <span className="home-tool-number">03</span>
            <IconLaurel className="home-tool-icon" />
            <h3>{t("common", "toolkitProgressTitle")}</h3>
            <p>{t("common", "toolkitProgressDescription")}</p>
            <span className="home-tool-link">
              {t("common", "toolkitOpenAction")} <span aria-hidden="true">↗</span>
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
