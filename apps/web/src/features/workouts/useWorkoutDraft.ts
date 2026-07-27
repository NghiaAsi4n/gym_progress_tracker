import type { Workout, WorkoutExercise } from "@gym-tracking/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import { ApiClientError } from "../../services/api-auth.js";
import { updateWorkoutDraft } from "../../services/workout-api.js";

export type SaveStatus = "saved" | "saving" | "error";

function editableSnapshot(workout: Workout): string {
  return JSON.stringify({ exercises: workout.exercises, notes: workout.notes });
}

export function useWorkoutDraft(initialWorkout: Workout) {
  const [workout, setWorkout] = useState(initialWorkout);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [saveError, setSaveError] = useState("");
  const versionRef = useRef(initialWorkout.version);
  const lastSavedRef = useRef(editableSnapshot(initialWorkout));

  const updateExercises = useCallback((exercises: WorkoutExercise[]) => {
    setSaveStatus("saving");
    setWorkout((current) => ({ ...current, exercises }));
  }, []);
  const updateNotes = useCallback((notes: string) => {
    setSaveStatus("saving");
    setWorkout((current) => ({ ...current, notes }));
  }, []);

  useEffect(() => {
    const snapshot = editableSnapshot(workout);
    if (snapshot === lastSavedRef.current) return;
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      void (async () => {
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const { data } = await updateWorkoutDraft(workout.id, {
              version: versionRef.current,
              exercises: workout.exercises.map(({ name: _name, ...exercise }) => exercise),
              notes: workout.notes,
            });
            versionRef.current = data.version;
            lastSavedRef.current = snapshot;
            setWorkout((current) => ({ ...current, version: data.version }));
            setSaveError("");
            setSaveStatus("saved");
            return;
          } catch (error) {
            lastError = error;
            if (error instanceof ApiClientError && error.status === 409) break;
            if (attempt < 2) {
              await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
            }
          }
        }
        setSaveError(lastError instanceof Error ? lastError.message : "Unable to save workout");
        setSaveStatus("error");
      })();
    }, 650);
    return () => window.clearTimeout(timer);
  }, [workout]);

  return {
    workout,
    updateExercises,
    updateNotes,
    saveStatus,
    saveError,
    isSynced: saveStatus === "saved",
  };
}
