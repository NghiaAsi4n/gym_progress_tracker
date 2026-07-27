import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import {
  createTemplate,
  deleteTemplate,
  listExercises,
  listTemplates,
  updateTemplate,
} from "../../services/planning-api.js";

export function WorkoutTemplatesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [exerciseIds, setExerciseIds] = useState<string[]>([]);
  const templates = useQuery({ queryKey: ["templates"], queryFn: listTemplates });
  const exercises = useQuery({
    queryKey: ["exercises", "template-picker"],
    queryFn: () => listExercises({ page: 1, pageSize: 100 }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["templates"] });
  const create = useMutation({ mutationFn: createTemplate, onSuccess: refresh });
  const update = useMutation({
    mutationFn: ({ id, ids }: { id: string; ids: string[] }) =>
      updateTemplate(id, { exerciseIds: ids }),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: deleteTemplate, onSuccess: refresh });

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate(
      { name, exerciseIds },
      {
        onSuccess: () => {
          setName("");
          setExerciseIds([]);
        },
      },
    );
  }

  return (
    <main className="planning-page">
      <header className="planning-heading">
        <p className="eyebrow">Workout templates</p>
        <h1>Compose repeatable training</h1>
      </header>
      <section className="planning-grid">
        <form className="planning-panel planning-form" onSubmit={submit}>
          <h2>New template</h2>
          <label>
            Template name
            <input onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <label>
            Add exercise
            <select
              onChange={(event) => {
                const id = event.target.value;
                if (id && !exerciseIds.includes(id)) setExerciseIds((current) => [...current, id]);
              }}
              value=""
            >
              <option value="">Choose an exercise</option>
              {exercises.data?.data.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
          </label>
          <ol>
            {exerciseIds.map((id) => (
              <li key={id}>
                {exercises.data?.data.find((exercise) => exercise.id === id)?.name ?? id}
              </li>
            ))}
          </ol>
          <button className="button button-primary" type="submit">
            Create template
          </button>
        </form>
        <div className="planning-panel">
          <h2>Your templates</h2>
          {templates.isPending ? <p role="status">Loading templates…</p> : null}
          {templates.data?.data.length === 0 ? <p role="status">No templates yet.</p> : null}
          <ul className="planning-list">
            {templates.data?.data.map((template) => (
              <li key={template.id}>
                <div>
                  <strong>{template.name}</strong>
                  <small>
                    {template.exercises.map(({ exercise }) => exercise.name).join(" → ")}
                  </small>
                </div>
                <div className="row-actions">
                  <button
                    disabled={template.exercises.length < 2}
                    onClick={() =>
                      update.mutate({
                        id: template.id,
                        ids: template.exercises.map(({ exerciseId }) => exerciseId).reverse(),
                      })
                    }
                    type="button"
                  >
                    Reverse order
                  </button>
                  <button onClick={() => remove.mutate(template.id)} type="button">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
