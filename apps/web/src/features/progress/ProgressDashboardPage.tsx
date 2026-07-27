import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useI18n } from "../../i18n/i18n-context.js";
import { listWorkoutHistory } from "../../services/workout-api.js";
import {
  listBodyWeights,
  listExerciseProgress,
  recalculateCalories,
} from "../../services/progress-api.js";
import { useUnit } from "../preferences/unit.js";
import { BodyWeightChart, ExerciseProgressChart, displayMass } from "./ProgressCharts.js";

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function ProgressDashboardPage() {
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const { unit } = useUnit();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [days, setDays] = useState(90);
  const from = addDays(today, -(days - 1));
  const exerciseProgress = useQuery({
    queryKey: ["exercise-progress", from, today],
    queryFn: () => listExerciseProgress(from, today),
  });
  const bodyWeights = useQuery({
    queryKey: ["body-weights", from, today],
    queryFn: () => listBodyWeights(from, today),
  });
  const workouts = useQuery({
    queryKey: ["workout-history", "progress"],
    queryFn: () => listWorkoutHistory(1, 20),
  });
  const recalculate = useMutation({
    mutationFn: recalculateCalories,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workout-history"] }),
  });
  const completed = workouts.data?.data.filter(({ status }) => status === "COMPLETED") ?? [];
  const totalCalories = completed.reduce(
    (sum, workout) => sum + (workout.calorieEstimate?.estimatedCalories ?? 0),
    0,
  );
  const topExercise = exerciseProgress.data?.data[0];
  const latestWeight = bodyWeights.data?.data.at(-1);

  return (
    <main className="progress-page">
      <header className="progress-header">
        <div>
          <p className="eyebrow">{t("progress", "dashboardEyebrow")}</p>
          <h1>{t("progress", "dashboardTitle")}</h1>
        </div>
        <label>
          {t("progress", "timeRange")}
          <select onChange={(event) => setDays(Number(event.target.value))} value={days}>
            <option value={30}>{t("progress", "days30")}</option>
            <option value={90}>{t("progress", "days90")}</option>
            <option value={365}>{t("progress", "year1")}</option>
          </select>
        </label>
      </header>
      <section className="progress-summary-grid" aria-label={t("progress", "progressSummary")}>
        <article>
          <span>{t("progress", "completedWorkouts")}</span>
          <strong>{completed.length}</strong>
        </article>
        <article>
          <span>{t("progress", "estimatedCalories")}</span>
          <strong>{totalCalories || "—"}</strong>
        </article>
        <article>
          <span>{t("progress", "latestWeight")}</span>
          <strong>
            {latestWeight
              ? `${displayMass(latestWeight.weightKg, unit)} ${unit.toLowerCase()}`
              : "—"}
          </strong>
        </article>
        <article>
          <span>{t("progress", "topExercise")}</span>
          <strong>{topExercise?.exerciseName ?? "—"}</strong>
        </article>
      </section>
      <div className="progress-actions">
        <Link className="button button-primary" to="/progress/body-weight">
          {t("progress", "logBodyWeight")}
        </Link>
      </div>
      {(exerciseProgress.isPending || bodyWeights.isPending || workouts.isPending) && (
        <p role="status">{t("progress", "loadingProgress")}</p>
      )}
      {(exerciseProgress.isError || bodyWeights.isError || workouts.isError) && (
        <p className="form-error" role="alert">
          {t("progress", "loadProgressError")}
        </p>
      )}
      <section className="progress-chart-grid">
        <BodyWeightChart entries={bodyWeights.data?.data ?? []} unit={unit} />
        {exerciseProgress.data?.data.slice(0, 3).map((progress) => (
          <ExerciseProgressChart key={progress.exerciseId} progress={progress} unit={unit} />
        ))}
      </section>
      {exerciseProgress.data?.data.length === 0 ? (
        <div className="workout-empty">
          <h2>{t("progress", "noExerciseProgress")}</h2>
          <p>{t("progress", "completeSetsHint")}</p>
        </div>
      ) : null}
      <section className="calorie-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">MET v1</p>
            <h2>{t("progress", "calorieEstimates")}</h2>
          </div>
          <span className="status-chip">{t("progress", "estimatesOnly")}</span>
        </div>
        <ul className="calorie-list">
          {completed.slice(0, 5).map((workout) => (
            <li key={workout.id}>
              <div>
                <strong>
                  {new Date(workout.startedAt).toLocaleDateString(
                    locale === "vi" ? "vi-VN" : "en-US",
                  )}
                </strong>
                <small>
                  {workout.durationSeconds ? Math.round(workout.durationSeconds / 60) : 0}{" "}
                  {t("progress", "minutesShort")}
                </small>
              </div>
              {workout.calorieEstimate ? (
                <strong>≈ {workout.calorieEstimate.estimatedCalories} kcal</strong>
              ) : (
                <button
                  disabled={recalculate.isPending}
                  onClick={() => recalculate.mutate(workout.id)}
                  type="button"
                >
                  {t("progress", "calculate")}
                </button>
              )}
            </li>
          ))}
        </ul>
        {recalculate.isError ? (
          <p className="form-error" role="alert">
            {t("progress", "calculateError")}
          </p>
        ) : null}
      </section>
    </main>
  );
}
