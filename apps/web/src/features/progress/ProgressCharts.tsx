import type { BodyWeight, ExerciseProgress } from "@gym-tracking/contracts";

import { useI18n } from "../../i18n/i18n-context.js";
import type { UnitPreference } from "../preferences/unit.js";

const LB_PER_KG = 2.2046226218;

// Shared presentation helper is colocated with the progress chart components.
// eslint-disable-next-line react-refresh/only-export-components
export function displayMass(valueKg: number, unit: UnitPreference): number {
  const value = unit === "LB" ? valueKg * LB_PER_KG : valueKg;
  return Math.round(value * 10) / 10;
}

function BarSeries({
  label,
  points,
}: {
  label: string;
  points: Array<{ key: string; value: number; display: string }>;
}) {
  const max = Math.max(1, ...points.map(({ value }) => value));
  return (
    <div className="progress-bars" role="img" aria-label={label}>
      {points.map((point) => (
        <div className="progress-bar-item" key={point.key}>
          <span
            aria-hidden="true"
            className="progress-bar"
            style={{ height: `${Math.max(4, (point.value / max) * 100)}%` }}
          />
          <small>{point.display}</small>
        </div>
      ))}
    </div>
  );
}

export function ExerciseProgressChart({
  progress,
  unit,
}: {
  progress: ExerciseProgress;
  unit: UnitPreference;
}) {
  const { t } = useI18n();

  return (
    <article className="progress-chart-card">
      <header>
        <div>
          <p className="eyebrow">{t("progress", "exerciseTrend")}</p>
          <h2>{progress.exerciseName}</h2>
        </div>
        <strong>
          {displayMass(progress.bestEstimated1RmKg, unit)} {unit.toLowerCase()} e1RM
        </strong>
      </header>
      <BarSeries
        label={`${progress.exerciseName} ${t("progress", "estimatedOneRepMaxTrend")}`}
        points={progress.timeSeries.map((point) => ({
          key: point.date,
          value: point.estimated1RmKg,
          display: point.date.slice(5),
        }))}
      />
      <dl className="progress-metrics">
        <div>
          <dt>{t("progress", "bestWeight")}</dt>
          <dd>
            {displayMass(progress.bestWeightKg, unit)} {unit.toLowerCase()}
          </dd>
        </div>
        <div>
          <dt>{t("progress", "weeklySets")}</dt>
          <dd>{progress.weeklySets}</dd>
        </div>
        <div>
          <dt>{t("progress", "personalRecords")}</dt>
          <dd>{progress.prDates.length}</dd>
        </div>
      </dl>
    </article>
  );
}

export function BodyWeightChart({
  entries,
  unit,
}: {
  entries: BodyWeight[];
  unit: UnitPreference;
}) {
  const { t } = useI18n();

  return (
    <article className="progress-chart-card">
      <header>
        <div>
          <p className="eyebrow">{t("progress", "bodyWeight")}</p>
          <h2>{t("progress", "weightTrend")}</h2>
        </div>
        <strong>
          {entries.length
            ? `${displayMass(entries.at(-1)!.weightKg, unit)} ${unit.toLowerCase()}`
            : t("progress", "noData")}
        </strong>
      </header>
      {entries.length ? (
        <BarSeries
          label={t("progress", "bodyWeightTrend")}
          points={entries.map((entry) => ({
            key: entry.id,
            value: entry.weightKg,
            display: entry.measuredOn.slice(5),
          }))}
        />
      ) : (
        <p className="helper-text">{t("progress", "addWeightHint")}</p>
      )}
    </article>
  );
}
