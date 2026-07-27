import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getWorkout, listWorkoutHistory } from "../../services/workout-api.js";
import { useUnit } from "../preferences/unit.js";

function sourceName(source: Awaited<ReturnType<typeof getWorkout>>["data"]["source"]): string {
  return source.type === "EMPTY" ? "Freestyle workout" : source.templateName;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
}

export function WorkoutHistoryPage() {
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: ["workout-history", page],
    queryFn: () => listWorkoutHistory(page),
  });

  return (
    <main className="workout-page">
      <header className="planning-heading">
        <p className="eyebrow">Training archive</p>
        <h1>Workout history</h1>
      </header>
      {history.isPending ? <p role="status">Loading history…</p> : null}
      {history.isError ? (
        <p className="form-error" role="alert">
          {history.error.message}
        </p>
      ) : null}
      {history.data?.data.length === 0 ? (
        <div className="workout-empty">
          <h2>No finished workouts yet</h2>
          <Link className="button button-primary" to="/workouts/active">
            Start a workout
          </Link>
        </div>
      ) : null}
      <ul className="history-list">
        {history.data?.data.map((workout) => (
          <li key={workout.id}>
            <Link to={`/workouts/history/${workout.id}`}>
              <div>
                <span className="status-chip">{workout.status}</span>
                <h2>{sourceName(workout.source)}</h2>
                <small>{new Date(workout.startedAt).toLocaleString()}</small>
              </div>
              <dl>
                <div>
                  <dt>Duration</dt>
                  <dd>{formatDuration(workout.durationSeconds)}</dd>
                </div>
                <div>
                  <dt>Exercises</dt>
                  <dd>{workout.exercises.length}</dd>
                </div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>
      {history.data && history.data.pagination.totalPages > 1 ? (
        <nav className="pagination" aria-label="Workout history pages">
          <button disabled={page === 1} onClick={() => setPage((value) => value - 1)} type="button">
            Previous
          </button>
          <span>
            {page} / {history.data.pagination.totalPages}
          </span>
          <button
            disabled={page === history.data.pagination.totalPages}
            onClick={() => setPage((value) => value + 1)}
            type="button"
          >
            Next
          </button>
        </nav>
      ) : null}
    </main>
  );
}

export function WorkoutDetailPage() {
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
        <p role="status">Loading workout…</p>
      </main>
    );
  }
  if (workout.isError) {
    return (
      <main className="workout-page">
        <p className="form-error" role="alert">
          {workout.error.message}
        </p>
      </main>
    );
  }

  const data = workout.data.data;
  return (
    <main className="workout-page">
      <Link className="back-link" to="/workouts/history">
        ← Workout history
      </Link>
      <header className="active-workout-header">
        <div>
          <p className="eyebrow">{data.status}</p>
          <h1>{sourceName(data.source)}</h1>
          <p>{new Date(data.startedAt).toLocaleString()}</p>
        </div>
        <dl className="workout-summary">
          <div>
            <dt>Duration</dt>
            <dd>{formatDuration(data.durationSeconds)}</dd>
          </div>
          <div>
            <dt>Volume</dt>
            <dd>
              {data.volumeKg === null
                ? "—"
                : `${Math.round(data.volumeKg * weightFactor)} ${unit.toLowerCase()}`}
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
                  <span>Set {set.order + 1}</span>
                  <strong>
                    {set.weightKg === null ? "—" : Math.round(set.weightKg * weightFactor * 10) / 10}{" "}
                    {unit.toLowerCase()} × {set.reps ?? "—"}
                  </strong>
                  <span>{set.isComplete ? "Completed" : "Not completed"}</span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
      {data.notes ? (
        <section className="workout-notes-readonly">
          <h2>Session notes</h2>
          <p>{data.notes}</p>
        </section>
      ) : null}
    </main>
  );
}
