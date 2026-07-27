import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import type {
  CreateExerciseRequest,
  Difficulty,
  Equipment,
  MovementPattern,
  MuscleGroup,
} from "@gym-tracking/contracts";

import {
  createExercise,
  deleteExercise,
  listExercises,
  updateExercise,
} from "../../services/planning-api.js";

export function ExerciseCatalogPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | "">("");
  const [formName, setFormName] = useState("");
  const [formMuscle, setFormMuscle] = useState<MuscleGroup>("CORE");
  const [movementPattern, setMovementPattern] = useState<MovementPattern>("ISOLATION");
  const [equipment, setEquipment] = useState<Equipment>("BODYWEIGHT");
  const [difficulty, setDifficulty] = useState<Difficulty>("BEGINNER");
  const exercises = useQuery({
    queryKey: ["exercises", name, muscleGroup],
    queryFn: () =>
      listExercises({
        page: 1,
        pageSize: 20,
        ...(name ? { name } : {}),
        ...(muscleGroup ? { muscleGroup } : {}),
      }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["exercises"] });
  const create = useMutation({ mutationFn: createExercise, onSuccess: refresh });
  const update = useMutation({
    mutationFn: ({ id, nextName }: { id: string; nextName: string }) =>
      updateExercise(id, { name: nextName }),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: deleteExercise, onSuccess: refresh });

  function submit(event: FormEvent) {
    event.preventDefault();
    const input: CreateExerciseRequest = {
      name: formName,
      muscleGroups: [formMuscle],
      movementPattern,
      equipment,
      difficulty,
    };
    create.mutate(input, { onSuccess: () => setFormName("") });
  }

  return (
    <main className="planning-page">
      <header className="planning-heading">
        <p className="eyebrow">Exercise catalog</p>
        <h1>Build your movement library</h1>
      </header>
      <section className="planning-toolbar" aria-label="Exercise filters">
        <label>
          Search exercises
          <input
            aria-label="Search exercises"
            onChange={(event) => setName(event.target.value)}
            type="search"
            value={name}
          />
        </label>
        <label>
          Muscle group
          <select
            onChange={(event) => setMuscleGroup(event.target.value as MuscleGroup | "")}
            value={muscleGroup}
          >
            <option value="">All groups</option>
            <option value="CHEST">Chest</option>
            <option value="BACK">Back</option>
            <option value="LEGS">Legs</option>
            <option value="CORE">Core</option>
          </select>
        </label>
      </section>

      <section className="planning-grid">
        <div className="planning-panel">
          <h2>Exercises</h2>
          {exercises.isPending ? <p role="status">Loading exercises…</p> : null}
          {exercises.isError ? <p role="alert">Could not load exercises.</p> : null}
          {exercises.data?.data.length === 0 ? <p role="status">No exercises found.</p> : null}
          <ul className="planning-list">
            {exercises.data?.data.map((exercise) => (
              <li key={exercise.id}>
                <div>
                  <strong>{exercise.name}</strong>
                  <small>
                    {exercise.muscleGroups.join(", ")} · {exercise.equipment}
                  </small>
                </div>
                {!exercise.isSystem ? (
                  <div className="row-actions">
                    <button
                      onClick={() =>
                        update.mutate({ id: exercise.id, nextName: `${exercise.name} updated` })
                      }
                      type="button"
                    >
                      Rename {exercise.name}
                    </button>
                    <button onClick={() => remove.mutate(exercise.id)} type="button">
                      Delete {exercise.name}
                    </button>
                  </div>
                ) : (
                  <span className="status-chip">System</span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <form className="planning-panel planning-form" onSubmit={submit}>
          <h2>Create custom exercise</h2>
          <label>
            Exercise name
            <input
              onChange={(event) => setFormName(event.target.value)}
              required
              value={formName}
            />
          </label>
          <label>
            Primary muscle group
            <select
              onChange={(event) => setFormMuscle(event.target.value as MuscleGroup)}
              value={formMuscle}
            >
              {["CHEST", "BACK", "LEGS", "CORE", "SHOULDERS", "BICEPS", "TRICEPS"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Movement pattern
            <select
              onChange={(event) => setMovementPattern(event.target.value as MovementPattern)}
              value={movementPattern}
            >
              {["PUSH", "PULL", "HINGE", "SQUAT", "CARRY", "ROTATION", "ISOLATION"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Equipment
            <select
              onChange={(event) => setEquipment(event.target.value as Equipment)}
              value={equipment}
            >
              {["BODYWEIGHT", "BARBELL", "DUMBBELL", "CABLE", "MACHINE", "RESISTANCE_BAND"].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Difficulty
            <select
              onChange={(event) => setDifficulty(event.target.value as Difficulty)}
              value={difficulty}
            >
              {["BEGINNER", "INTERMEDIATE", "ADVANCED"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          {create.isError ? <p role="alert">Could not create exercise.</p> : null}
          <button className="button button-primary" disabled={create.isPending} type="submit">
            Create exercise
          </button>
        </form>
      </section>
    </main>
  );
}
