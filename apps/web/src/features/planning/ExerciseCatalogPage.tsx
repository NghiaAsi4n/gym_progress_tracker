import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import type {
  CreateExerciseRequest,
  Difficulty,
  Equipment,
  Exercise,
  MovementPattern,
  MuscleGroup,
} from "@gym-tracking/contracts";

import { useI18n } from "../../i18n/i18n-context.js";
import {
  createExercise,
  deleteExercise,
  listExercises,
  updateExercise,
} from "../../services/planning-api.js";
import {
  DIFFICULTY_LABELS,
  EQUIPMENT_LABELS,
  MOVEMENT_LABELS,
  MUSCLE_LABELS,
  optionEntries,
} from "./planning-labels.js";
import { MuscleGroupPicker } from "./MuscleGroupPicker.js";

const MUSCLE_OPTIONS = optionEntries(MUSCLE_LABELS);
const MOVEMENT_OPTIONS = optionEntries(MOVEMENT_LABELS);
const EQUIPMENT_OPTIONS = optionEntries(EQUIPMENT_LABELS);
const DIFFICULTY_OPTIONS = optionEntries(DIFFICULTY_LABELS);

export function ExerciseCatalogPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | "">("");
  const [formName, setFormName] = useState("");
  const [formMuscles, setFormMuscles] = useState<MuscleGroup[]>([]);
  const [hasMuscleError, setHasMuscleError] = useState(false);
  const [movementPattern, setMovementPattern] = useState<MovementPattern>("ISOLATION");
  const [equipment, setEquipment] = useState<Equipment>("BODYWEIGHT");
  const [difficulty, setDifficulty] = useState<Difficulty>("BEGINNER");
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editName, setEditName] = useState("");
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
    onSuccess: () => {
      setEditingExercise(null);
      setEditName("");
      return refresh();
    },
  });
  const remove = useMutation({ mutationFn: deleteExercise, onSuccess: refresh });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (formMuscles.length === 0) {
      setHasMuscleError(true);
      return;
    }
    const input: CreateExerciseRequest = {
      name: formName,
      muscleGroups: formMuscles,
      movementPattern,
      equipment,
      difficulty,
    };
    create.mutate(input, {
      onSuccess: () => {
        setFormName("");
        setFormMuscles([]);
        setHasMuscleError(false);
      },
    });
  }

  function beginRename(exercise: Exercise) {
    update.reset();
    setEditingExercise(exercise);
    setEditName(exercise.name);
  }

  function submitRename(event: FormEvent) {
    event.preventDefault();
    const nextName = editName.trim();
    if (!editingExercise || !nextName) return;
    update.mutate({ id: editingExercise.id, nextName });
  }

  return (
    <main className="planning-page">
      <header className="planning-heading">
        <p className="eyebrow">{t("planning", "catalogEyebrow")}</p>
        <h1>{t("planning", "catalogTitle")}</h1>
      </header>
      <section className="planning-toolbar" aria-label={t("planning", "exerciseFilters")}>
        <label>
          {t("planning", "searchExercises")}
          <input
            aria-label={t("planning", "searchExercises")}
            onChange={(event) => setName(event.target.value)}
            type="search"
            value={name}
          />
        </label>
        <label>
          {t("planning", "muscleGroup")}
          <select
            onChange={(event) => setMuscleGroup(event.target.value as MuscleGroup | "")}
            value={muscleGroup}
          >
            <option value="">{t("planning", "allGroups")}</option>
            {MUSCLE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {t("planning", label)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="planning-grid">
        <div className="planning-panel">
          <h2>{t("planning", "exercises")}</h2>
          {exercises.isPending ? <p role="status">{t("planning", "loadingExercises")}</p> : null}
          {exercises.isError ? <p role="alert">{t("planning", "loadExercisesError")}</p> : null}
          {exercises.data?.data.length === 0 ? (
            <p role="status">{t("planning", "noExercises")}</p>
          ) : null}
          <ul className="planning-list">
            {exercises.data?.data.map((exercise) => (
              <li key={exercise.id}>
                {editingExercise?.id === exercise.id ? (
                  <form className="exercise-edit-form planning-form" onSubmit={submitRename}>
                    <label>
                      {t("planning", "newExerciseName")}
                      <input
                        autoFocus
                        maxLength={120}
                        onChange={(event) => setEditName(event.target.value)}
                        required
                        value={editName}
                      />
                    </label>
                    <div className="row-actions">
                      <button disabled={!editName.trim() || update.isPending} type="submit">
                        {t("planning", "saveName")}
                      </button>
                      <button
                        disabled={update.isPending}
                        onClick={() => {
                          update.reset();
                          setEditingExercise(null);
                        }}
                        type="button"
                      >
                        {t("planning", "cancel")}
                      </button>
                    </div>
                    {update.isError ? (
                      <p className="form-error" role="alert">
                        {t("planning", "updateExerciseError")}
                      </p>
                    ) : null}
                  </form>
                ) : (
                  <>
                    <div>
                      <strong>{exercise.name}</strong>
                      <small>
                        {exercise.muscleGroups
                          .map((value) => MUSCLE_LABELS[value])
                          .map((key) => t("planning", key))
                          .join(", ")}{" "}
                        · {t("planning", EQUIPMENT_LABELS[exercise.equipment])}
                      </small>
                    </div>
                    {!exercise.isSystem ? (
                      <div className="row-actions">
                        <button
                          aria-label={`${t("planning", "rename")} ${exercise.name}`}
                          onClick={() => beginRename(exercise)}
                          type="button"
                        >
                          {t("planning", "rename")}
                        </button>
                        <button
                          aria-label={`${t("planning", "delete")} ${exercise.name}`}
                          onClick={() => remove.mutate(exercise.id)}
                          type="button"
                        >
                          {t("planning", "delete")}
                        </button>
                      </div>
                    ) : (
                      <span className="status-chip">{t("planning", "systemExercise")}</span>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
        <form className="planning-panel planning-form" onSubmit={submit}>
          <h2>{t("planning", "createCustomExercise")}</h2>
          <label>
            {t("planning", "exerciseName")}
            <input
              onChange={(event) => setFormName(event.target.value)}
              required
              value={formName}
            />
          </label>
          <MuscleGroupPicker
            hasError={hasMuscleError}
            onChange={(groups) => {
              setFormMuscles(groups);
              setHasMuscleError(false);
            }}
            selected={formMuscles}
          />
          <label>
            {t("planning", "movementPattern")}
            <select
              onChange={(event) => setMovementPattern(event.target.value as MovementPattern)}
              value={movementPattern}
            >
              {MOVEMENT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {t("planning", label)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("planning", "equipment")}
            <select
              onChange={(event) => setEquipment(event.target.value as Equipment)}
              value={equipment}
            >
              {EQUIPMENT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {t("planning", label)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("planning", "difficulty")}
            <select
              onChange={(event) => setDifficulty(event.target.value as Difficulty)}
              value={difficulty}
            >
              {DIFFICULTY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {t("planning", label)}
                </option>
              ))}
            </select>
          </label>
          {create.isError ? <p role="alert">{t("planning", "createExerciseError")}</p> : null}
          <button className="button button-primary" disabled={create.isPending} type="submit">
            {t("planning", "createExercise")}
          </button>
        </form>
      </section>
    </main>
  );
}
