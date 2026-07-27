import type { WorkoutExercise } from "@gym-tracking/contracts";

import type { UnitPreference } from "../preferences/unit.js";

interface Props {
  exercise: WorkoutExercise;
  index: number;
  total: number;
  unit: UnitPreference;
  onChange: (exercise: WorkoutExercise) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

const POUNDS_PER_KG = 2.2046226218;

function displayWeight(weightKg: number | null, unit: UnitPreference): string {
  if (weightKg === null) return "";
  const value = unit === "LB" ? weightKg * POUNDS_PER_KG : weightKg;
  return String(Math.round(value * 10) / 10);
}

function canonicalWeight(value: string, unit: UnitPreference): number | null {
  if (value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return unit === "LB" ? parsed / POUNDS_PER_KG : parsed;
}

function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function WorkoutExerciseEditor({
  exercise,
  index,
  total,
  unit,
  onChange,
  onMove,
  onRemove,
}: Props) {
  return (
    <article className="workout-exercise">
      <header className="workout-exercise-heading">
        <div>
          <span className="exercise-number">{String(index + 1).padStart(2, "0")}</span>
          <h2>{exercise.name}</h2>
        </div>
        <div className="row-actions">
          <button disabled={index === 0} onClick={() => onMove(-1)} type="button">
            ↑
          </button>
          <button disabled={index === total - 1} onClick={() => onMove(1)} type="button">
            ↓
          </button>
          <button onClick={onRemove} type="button">
            Remove
          </button>
        </div>
      </header>
      <div className="set-table" role="group" aria-label={`${exercise.name} sets`}>
        <div className="set-row set-row-heading" aria-hidden="true">
          <span>Set</span>
          <span>{unit.toLowerCase()}</span>
          <span>Reps</span>
          <span>Done</span>
          <span />
        </div>
        {exercise.sets.map((set, setIndex) => (
          <div className="set-row" key={set.id}>
            <strong>{setIndex + 1}</strong>
            <label>
              <span className="sr-only">Weight for set {setIndex + 1}</span>
              <input
                inputMode="decimal"
                min="0"
                onChange={(event) => {
                  const sets = exercise.sets.map((item) =>
                    item.id === set.id
                      ? { ...item, weightKg: canonicalWeight(event.target.value, unit) }
                      : item,
                  );
                  onChange({ ...exercise, sets });
                }}
                type="number"
                value={displayWeight(set.weightKg, unit)}
              />
            </label>
            <label>
              <span className="sr-only">Reps for set {setIndex + 1}</span>
              <input
                inputMode="numeric"
                min="0"
                onChange={(event) => {
                  const value = event.target.value === "" ? null : Number(event.target.value);
                  const sets = exercise.sets.map((item) =>
                    item.id === set.id ? { ...item, reps: value } : item,
                  );
                  onChange({ ...exercise, sets });
                }}
                type="number"
                value={set.reps ?? ""}
              />
            </label>
            <label className="set-complete">
              <span className="sr-only">Complete set {setIndex + 1}</span>
              <input
                checked={set.isComplete}
                onChange={(event) => {
                  const sets = exercise.sets.map((item) =>
                    item.id === set.id ? { ...item, isComplete: event.target.checked } : item,
                  );
                  onChange({ ...exercise, sets });
                }}
                type="checkbox"
              />
            </label>
            <button
              aria-label={`Remove set ${setIndex + 1}`}
              onClick={() =>
                onChange({
                  ...exercise,
                  sets: exercise.sets
                    .filter(({ id }) => id !== set.id)
                    .map((item, order) => ({ ...item, order })),
                })
              }
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        className="add-set-button"
        onClick={() =>
          onChange({
            ...exercise,
            sets: [
              ...exercise.sets,
              {
                id: newId(),
                order: exercise.sets.length,
                weightKg: null,
                reps: null,
                isComplete: false,
                notes: "",
              },
            ],
          })
        }
        type="button"
      >
        + Add set
      </button>
    </article>
  );
}
