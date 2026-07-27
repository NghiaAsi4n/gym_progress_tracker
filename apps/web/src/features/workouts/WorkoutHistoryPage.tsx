import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "../../components/ui/Button.js";
import { Dialog } from "../../components/ui/Dialog.js";
import { useI18n } from "../../i18n/i18n-context.js";
import { deleteWorkout, getWorkout, listWorkoutHistory } from "../../services/workout-api.js";
import { useUnit } from "../preferences/unit.js";

type Translate = ReturnType<typeof useI18n>["t"];

function sourceName(
  source: Awaited<ReturnType<typeof getWorkout>>["data"]["source"],
  t: Translate,
): string {
  return source.type === "EMPTY" ? t("workouts", "freestyleWorkout") : source.templateName;
}

function formatDuration(seconds: number | null, t: Translate): string {
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  return `${minutes} ${t("workouts", "minutesShort")}`;
}

function workoutStatus(status: "ACTIVE" | "COMPLETED" | "CANCELLED", t: Translate) {
  if (status === "ACTIVE") return t("workouts", "statusActive");
  if (status === "COMPLETED") return t("workouts", "statusCompleted");
  return t("workouts", "statusCancelled");
}

export function WorkoutHistoryPage() {
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [workoutToDelete, setWorkoutToDelete] = useState<
    Awaited<ReturnType<typeof listWorkoutHistory>>["data"][number] | null
  >(null);
  const history = useQuery({
    queryKey: ["workout-history", page],
    queryFn: () => listWorkoutHistory(page),
  });
  const remove = useMutation({
    mutationFn: deleteWorkout,
    onSuccess: () => {
      setWorkoutToDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["workout-history"] });
    },
  });

  return (
    <main className="workout-page">
      <header className="planning-heading">
        <p className="eyebrow">{t("workouts", "archiveEyebrow")}</p>
        <h1>{t("workouts", "historyTitle")}</h1>
      </header>
      {history.isPending ? <p role="status">{t("workouts", "loadingHistory")}</p> : null}
      {history.isError ? (
        <p className="form-error" role="alert">
          {t("workouts", "loadHistoryError")}
        </p>
      ) : null}
      {history.data?.data.length === 0 ? (
        <div className="workout-empty">
          <h2>{t("workouts", "noFinishedWorkouts")}</h2>
          <Link className="button button-primary" to="/workouts/active">
            {t("workouts", "startWorkout")}
          </Link>
        </div>
      ) : null}
      <ul className="history-list">
        {history.data?.data.map((workout) => (
          <li key={workout.id}>
            <Link to={`/workouts/history/${workout.id}`}>
              <div>
                <span className="status-chip">{workoutStatus(workout.status, t)}</span>
                <h2>{sourceName(workout.source, t)}</h2>
                <small>
                  {new Date(workout.startedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
                </small>
              </div>
              <dl>
                <div>
                  <dt>{t("workouts", "duration")}</dt>
                  <dd>{formatDuration(workout.durationSeconds, t)}</dd>
                </div>
                <div>
                  <dt>{t("workouts", "exercises")}</dt>
                  <dd>{workout.exercises.length}</dd>
                </div>
              </dl>
            </Link>
            <div className="history-list-actions">
              <Button onClick={() => setWorkoutToDelete(workout)} variant="secondary">
                {t("workouts", "deleteWorkout")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {history.data && history.data.pagination.totalPages > 1 ? (
        <nav className="pagination" aria-label={t("workouts", "historyPages")}>
          <button disabled={page === 1} onClick={() => setPage((value) => value - 1)} type="button">
            {t("workouts", "previous")}
          </button>
          <span>
            {page} / {history.data.pagination.totalPages}
          </span>
          <button
            disabled={page === history.data.pagination.totalPages}
            onClick={() => setPage((value) => value + 1)}
            type="button"
          >
            {t("workouts", "next")}
          </button>
        </nav>
      ) : null}
      <Dialog
        closeLabel={t("planning", "cancel")}
        description={t("workouts", "deleteWorkoutDescription")}
        isOpen={workoutToDelete !== null}
        onClose={() => {
          if (!remove.isPending) setWorkoutToDelete(null);
        }}
        title={t("workouts", "deleteWorkoutTitle")}
      >
        {workoutToDelete ? (
          <div className="dialog-actions">
            <Button
              disabled={remove.isPending}
              onClick={() => setWorkoutToDelete(null)}
              variant="secondary"
            >
              {t("workouts", "keepWorkout")}
            </Button>
            <Button
              isLoading={remove.isPending}
              loadingLabel={t("workouts", "deleteWorkout")}
              onClick={() => remove.mutate(workoutToDelete.id)}
            >
              {t("workouts", "deleteWorkout")}
            </Button>
            {remove.isError ? (
              <p className="form-error" role="alert">
                {t("workouts", "deleteWorkoutError")}
              </p>
            ) : null}
          </div>
        ) : null}
      </Dialog>
    </main>
  );
}

export function WorkoutDetailPage() {
  const { locale, t } = useI18n();
  const { id = "" } = useParams();
  const { unit } = useUnit();
  const workout = useQuery({
    queryKey: ["workout", id],
    queryFn: () => getWorkout(id),
    enabled: Boolean(id),
  });
  const weightFactor = unit === "LB" ? 2.2046226218 : 1;

  if (workout.isPending) {
    return (
      <main className="workout-page">
        <p role="status">{t("workouts", "loadingWorkout")}</p>
      </main>
    );
  }
  if (workout.isError) {
    return (
      <main className="workout-page">
        <p className="form-error" role="alert">
          {t("workouts", "loadWorkoutError")}
        </p>
      </main>
    );
  }

  const data = workout.data.data;
  return (
    <main className="workout-page">
      <Link className="back-link" to="/workouts/history">
        ← {t("workouts", "backToHistory")}
      </Link>
      <header className="active-workout-header">
        <div>
          <p className="eyebrow">{workoutStatus(data.status, t)}</p>
          <h1>{sourceName(data.source, t)}</h1>
          <p>{new Date(data.startedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}</p>
        </div>
        <dl className="workout-summary">
          <div>
            <dt>{t("workouts", "duration")}</dt>
            <dd>{formatDuration(data.durationSeconds, t)}</dd>
          </div>
          <div>
            <dt>{t("workouts", "volume")}</dt>
            <dd>
              {data.volumeKg === null
                ? "—"
                : `${Math.round(data.volumeKg * weightFactor)} ${unit.toLowerCase()}`}
            </dd>
          </div>
          <div>
            <dt>{t("workouts", "calories")}</dt>
            <dd>
              {data.calorieEstimate
                ? `≈ ${data.calorieEstimate.estimatedCalories} kcal`
                : t("workouts", "notEstimated")}
            </dd>
          </div>
        </dl>
      </header>
      <div className="workout-exercise-list">
        {data.exercises.map((exercise) => (
          <article className="workout-exercise" key={exercise.id}>
            <h2>{exercise.name}</h2>
            <ol className="history-set-list">
              {exercise.sets.map((set) => (
                <li key={set.id}>
                  <span>
                    {t("workouts", "set")} {set.order + 1}
                  </span>
                  <strong>
                    {set.weightKg === null
                      ? "—"
                      : Math.round(set.weightKg * weightFactor * 10) / 10}{" "}
                    {unit.toLowerCase()} × {set.reps ?? "—"}
                  </strong>
                  <span>
                    {set.isComplete ? t("workouts", "completed") : t("workouts", "notCompleted")}
                  </span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
      {data.notes ? (
        <section className="workout-notes-readonly">
          <h2>{t("workouts", "sessionNotes")}</h2>
          <p>{data.notes}</p>
        </section>
      ) : null}
    </main>
  );
}
