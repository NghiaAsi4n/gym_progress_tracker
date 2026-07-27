import type { ExerciseSuggestion, ScheduledWorkout, TrainingPlan } from "@gym-tracking/contracts";

import { useI18n } from "../../i18n/i18n-context.js";
import {
  MOVEMENT_LABELS,
  TRAINING_GOAL_LABELS,
  translatePlanningValue,
} from "./planning-labels.js";

function scheduleStatus(
  status: ScheduledWorkout["status"],
  t: ReturnType<typeof useI18n>["t"],
): string {
  if (status === "SCHEDULED") return t("planning", "statusScheduled");
  return t("planning", "statusRescheduled");
}

export function CalendarPanel({
  isLoading,
  planId,
  workouts,
  onMove,
  onSkip,
  onViewSuggestions,
}: {
  isLoading: boolean;
  planId: string | null;
  workouts: ScheduledWorkout[];
  onMove: (workout: ScheduledWorkout) => void;
  onSkip: (workout: ScheduledWorkout) => void;
  onViewSuggestions: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="planning-panel">
      <div className="panel-title-row">
        <h2>{t("planning", "nextSevenDays")}</h2>
        <button disabled={!planId} onClick={onViewSuggestions} type="button">
          {t("planning", "viewSuggestions")}
        </button>
      </div>
      {isLoading ? <p role="status">{t("planning", "loadingCalendar")}</p> : null}
      {workouts.length === 0 ? <p role="status">{t("planning", "noScheduledWorkouts")}</p> : null}
      <ul className="planning-list">
        {workouts.map((workout) => (
          <li key={`${workout.templateId}-${workout.scheduledDate}`}>
            <div>
              <strong>{workout.templateName}</strong>
              <small>
                {workout.scheduledDate} · {scheduleStatus(workout.status, t)}
              </small>
            </div>
            <div className="row-actions">
              <button onClick={() => onMove(workout)} type="button">
                {t("planning", "moveOneDay")}
              </button>
              <button onClick={() => onSkip(workout)} type="button">
                {t("planning", "skip")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlansPanel({
  plans,
  onActivate,
  onDelete,
}: {
  plans: TrainingPlan[];
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useI18n();

  return (
    <section className="planning-panel suggestions-panel" aria-labelledby="plans-title">
      <h2 id="plans-title">{t("planning", "yourPlans")}</h2>
      <ul className="planning-list">
        {plans.map((plan) => (
          <li key={plan.id}>
            <div>
              <strong>{plan.name}</strong>
              <small>{plan.isActive ? t("planning", "active") : t("planning", "inactive")}</small>
            </div>
            <div className="row-actions">
              {!plan.isActive ? (
                <button onClick={() => onActivate(plan.id)} type="button">
                  {t("planning", "makeActive")}
                </button>
              ) : null}
              <button onClick={() => onDelete(plan.id)} type="button">
                {t("planning", "delete")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SuggestionsPanel({
  suggestions,
  onAccept,
}: {
  suggestions: ExerciseSuggestion[] | null;
  onAccept: (suggestion: ExerciseSuggestion) => void;
}) {
  const { t } = useI18n();

  if (!suggestions) return null;
  return (
    <section className="planning-panel suggestions-panel" aria-labelledby="suggestions-title">
      <h2 id="suggestions-title">{t("planning", "explainableSuggestions")}</h2>
      <ul className="planning-list">
        {suggestions.map((suggestion) => (
          <li key={suggestion.exerciseId}>
            <div>
              <strong>{suggestion.exerciseName}</strong>
              <small>
                {t("planning", "fills")}{" "}
                {translatePlanningValue(
                  suggestion.reasonParams.movementPattern,
                  MOVEMENT_LABELS,
                  t,
                )}{" "}
                {t("planning", "forGoal")}{" "}
                {translatePlanningValue(suggestion.reasonParams.goal, TRAINING_GOAL_LABELS, t)}
              </small>
            </div>
            <button
              aria-label={`${t("planning", "accept")} ${suggestion.exerciseName}`}
              disabled={!suggestion.suggestedTemplateId}
              onClick={() => onAccept(suggestion)}
              type="button"
            >
              {t("planning", "accept")}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
