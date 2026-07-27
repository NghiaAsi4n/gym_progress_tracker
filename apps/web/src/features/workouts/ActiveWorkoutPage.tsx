import type { Workout, WorkoutExercise } from "@gym-tracking/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  listExercises,
  listScheduledWorkouts,
  listTemplates,
} from "../../services/planning-api.js";
import {
  cancelWorkout,
  completeWorkout,
  createWorkoutDraft,
  getActiveWorkout,
} from "../../services/workout-api.js";
import { useI18n } from "../../i18n/i18n-context.js";
import { useUnit } from "../preferences/unit.js";
import { useWorkoutDraft } from "./useWorkoutDraft.js";
import { WorkoutExerciseEditor } from "./WorkoutExerciseEditor.js";

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function WorkoutStartPanel({ onStarted }: { onStarted: () => void }) {
  const { t } = useI18n();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const templates = useQuery({ queryKey: ["templates"], queryFn: listTemplates });
  const calendar = useQuery({
    queryKey: ["calendar", "workout-start", today],
    queryFn: () =>
      listScheduledWorkouts(
        today,
        addDays(today, 7),
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      ),
  });
  const start = useMutation({ mutationFn: createWorkoutDraft, onSuccess: onStarted });

  return (
    <section className="workout-start-grid">
      <div className="workout-start-primary">
        <p className="eyebrow">{t("workouts", "startNow")}</p>
        <h2>{t("workouts", "blankCanvas")}</h2>
        <p>{t("workouts", "blankDescription")}</p>
        <button
          className="button button-primary"
          disabled={start.isPending}
          onClick={() => start.mutate({ source: { type: "EMPTY" } })}
          type="button"
        >
          {t("workouts", "startEmptyWorkout")}
        </button>
      </div>
      <div className="workout-start-options">
        <h2>{t("workouts", "fromPlan")}</h2>
        {calendar.data?.data.length ? (
          <ul className="workout-option-list">
            {calendar.data.data.map((workout) => (
              <li key={`${workout.planId}-${workout.scheduledDate}`}>
                <div>
                  <strong>{workout.templateName}</strong>
                  <small>{workout.scheduledDate}</small>
                </div>
                <button
                  disabled={start.isPending}
                  onClick={() =>
                    start.mutate({
                      source: {
                        type: "SCHEDULED",
                        planId: workout.planId,
                        templateId: workout.templateId,
                        scheduledDate: workout.scheduledDate,
                      },
                    })
                  }
                  type="button"
                >
                  {t("workouts", "start")}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="helper-text">{t("workouts", "noScheduledWorkout")}</p>
        )}
        <h2>{t("workouts", "fromTemplate")}</h2>
        <ul className="workout-option-list">
          {templates.data?.data.map((template) => (
            <li key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <small>
                  {template.exercises.length} {t("workouts", "exerciseCount")}
                </small>
              </div>
              <button
                disabled={start.isPending}
                onClick={() =>
                  start.mutate({ source: { type: "TEMPLATE", templateId: template.id } })
                }
                type="button"
              >
                {t("workouts", "start")}
              </button>
            </li>
          ))}
        </ul>
        {start.isError ? (
          <p className="form-error" role="alert">
            {t("workouts", "startWorkoutError")}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ActiveSession({ initialWorkout }: { initialWorkout: Workout }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { unit } = useUnit();
  const [exerciseId, setExerciseId] = useState("");
  const draft = useWorkoutDraft(initialWorkout);
  const exercises = useQuery({
    queryKey: ["exercises", "active-workout"],
    queryFn: () => listExercises({ page: 1, pageSize: 100 }),
  });
  const close = useMutation({
    mutationFn: ({ action, version }: { action: "complete" | "cancel"; version: number }) =>
      action === "complete"
        ? completeWorkout(draft.workout.id, version)
        : cancelWorkout(draft.workout.id, version),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["active-workout"] });
      void queryClient.invalidateQueries({ queryKey: ["workout-history"] });
      void navigate("/workouts/history");
    },
  });

  function addExercise() {
    const exercise = exercises.data?.data.find(({ id }) => id === exerciseId);
    if (!exercise || draft.workout.exercises.some(({ exerciseId: id }) => id === exercise.id))
      return;
    const next: WorkoutExercise = {
      id: newId(),
      exerciseId: exercise.id,
      name: exercise.name,
      order: draft.workout.exercises.length,
      sets: Array.from({ length: 3 }, (_, order) => ({
        id: newId(),
        order,
        weightKg: null,
        reps: null,
        isComplete: false,
        notes: "",
      })),
    };
    draft.updateExercises([...draft.workout.exercises, next]);
    setExerciseId("");
  }

  function sourceLabel(): string {
    if (draft.workout.source.type === "EMPTY") return t("workouts", "freestyleWorkout");
    return draft.workout.source.templateName;
  }

  return (
    <>
      <header className="active-workout-header">
        <div>
          <p className="eyebrow">{t("workouts", "activeWorkout")}</p>
          <h1>{sourceLabel()}</h1>
          <p className={`save-state save-state-${draft.saveStatus}`} aria-live="polite">
            {draft.saveStatus === "saving"
              ? t("workouts", "saving")
              : draft.saveStatus === "error"
                ? t("workouts", "saveFailed")
                : t("workouts", "allChangesSaved")}
          </p>
        </div>
        <div className="workout-close-actions">
          <button
            disabled={!draft.isSynced || close.isPending}
            onClick={() => close.mutate({ action: "cancel", version: draft.workout.version })}
            type="button"
          >
            {t("workouts", "cancelWorkout")}
          </button>
          <button
            className="button button-primary"
            disabled={!draft.isSynced || close.isPending}
            onClick={() => close.mutate({ action: "complete", version: draft.workout.version })}
            type="button"
          >
            {t("workouts", "complete")}
          </button>
        </div>
      </header>
      <div className="workout-add-exercise">
        <label>
          {t("workouts", "addExercise")}
          <select onChange={(event) => setExerciseId(event.target.value)} value={exerciseId}>
            <option value="">{t("workouts", "chooseFromCatalog")}</option>
            {exercises.data?.data
              .filter(
                ({ id }) => !draft.workout.exercises.some(({ exerciseId }) => exerciseId === id),
              )
              .map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
          </select>
        </label>
        <button disabled={!exerciseId} onClick={addExercise} type="button">
          {t("workouts", "add")}
        </button>
      </div>
      <div className="workout-exercise-list">
        {draft.workout.exercises.length === 0 ? (
          <p className="workout-empty" role="status">
            {t("workouts", "emptyWorkout")}
          </p>
        ) : null}
        {draft.workout.exercises.map((exercise, index) => (
          <WorkoutExerciseEditor
            exercise={exercise}
            index={index}
            key={exercise.id}
            onChange={(next) =>
              draft.updateExercises(
                draft.workout.exercises.map((item) => (item.id === next.id ? next : item)),
              )
            }
            onMove={(direction) => {
              const next = [...draft.workout.exercises];
              const target = index + direction;
              [next[index], next[target]] = [next[target]!, next[index]!];
              draft.updateExercises(next.map((item, order) => ({ ...item, order })));
            }}
            onRemove={() =>
              draft.updateExercises(
                draft.workout.exercises
                  .filter(({ id }) => id !== exercise.id)
                  .map((item, order) => ({ ...item, order })),
              )
            }
            total={draft.workout.exercises.length}
            unit={unit}
          />
        ))}
      </div>
      <label className="workout-notes">
        {t("workouts", "sessionNotes")}
        <textarea
          maxLength={2000}
          onChange={(event) => draft.updateNotes(event.target.value)}
          placeholder={t("workouts", "notesPlaceholder")}
          rows={4}
          value={draft.workout.notes}
        />
      </label>
      {close.isError ? (
        <p className="form-error" role="alert">
          {t("workouts", "closeWorkoutError")}
        </p>
      ) : null}
    </>
  );
}

export function ActiveWorkoutPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const active = useQuery({
    queryKey: ["active-workout"],
    queryFn: getActiveWorkout,
    retry: false,
  });

  return (
    <main className="workout-page">
      {active.isPending ? <p role="status">{t("workouts", "loadingActiveWorkout")}</p> : null}
      {active.isError ? (
        <p className="form-error" role="alert">
          {t("workouts", "loadActiveWorkoutError")}
        </p>
      ) : null}
      {active.data?.data ? (
        <ActiveSession initialWorkout={active.data.data} key={active.data.data.id} />
      ) : active.isSuccess ? (
        <>
          <header className="planning-heading">
            <p className="eyebrow">{t("workouts", "executionEyebrow")}</p>
            <h1>{t("workouts", "executionTitle")}</h1>
          </header>
          <WorkoutStartPanel
            onStarted={() => void queryClient.invalidateQueries({ queryKey: ["active-workout"] })}
          />
        </>
      ) : null}
    </main>
  );
}
