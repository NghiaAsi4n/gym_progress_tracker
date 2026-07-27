import type { ExerciseSuggestion, ScheduledWorkout, TrainingPlan } from "@gym-tracking/contracts";

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
  return (
    <div className="planning-panel">
      <div className="panel-title-row">
        <h2>Next seven days</h2>
        <button disabled={!planId} onClick={onViewSuggestions} type="button">
          View suggestions
        </button>
      </div>
      {isLoading ? <p role="status">Loading calendar…</p> : null}
      {workouts.length === 0 ? <p role="status">No scheduled workouts.</p> : null}
      <ul className="planning-list">
        {workouts.map((workout) => (
          <li key={`${workout.templateId}-${workout.scheduledDate}`}>
            <div>
              <strong>{workout.templateName}</strong>
              <small>
                {workout.scheduledDate} · {workout.status}
              </small>
            </div>
            <div className="row-actions">
              <button onClick={() => onMove(workout)} type="button">
                Move one day
              </button>
              <button onClick={() => onSkip(workout)} type="button">
                Skip
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
  return (
    <section className="planning-panel suggestions-panel" aria-labelledby="plans-title">
      <h2 id="plans-title">Your plans</h2>
      <ul className="planning-list">
        {plans.map((plan) => (
          <li key={plan.id}>
            <div>
              <strong>{plan.name}</strong>
              <small>{plan.isActive ? "Active" : "Inactive"}</small>
            </div>
            <div className="row-actions">
              {!plan.isActive ? (
                <button onClick={() => onActivate(plan.id)} type="button">
                  Make active
                </button>
              ) : null}
              <button onClick={() => onDelete(plan.id)} type="button">
                Delete
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
  if (!suggestions) return null;
  return (
    <section className="planning-panel suggestions-panel" aria-labelledby="suggestions-title">
      <h2 id="suggestions-title">Explainable suggestions</h2>
      <ul className="planning-list">
        {suggestions.map((suggestion) => (
          <li key={suggestion.exerciseId}>
            <div>
              <strong>{suggestion.exerciseName}</strong>
              <small>
                Fills {String(suggestion.reasonParams.movementPattern)} for{" "}
                {String(suggestion.reasonParams.goal)}
              </small>
            </div>
            <button
              aria-label={`Accept ${suggestion.exerciseName}`}
              disabled={!suggestion.suggestedTemplateId}
              onClick={() => onAccept(suggestion)}
              type="button"
            >
              Accept
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
