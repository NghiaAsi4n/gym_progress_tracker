import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";

import {
  createBodyWeight,
  deleteBodyWeight,
  listBodyWeights,
  updateBodyWeight,
} from "../../services/progress-api.js";
import { useUnit } from "../preferences/unit.js";
import { displayMass } from "./ProgressCharts.js";

const LB_PER_KG = 2.2046226218;

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function BodyWeightPage() {
  const queryClient = useQueryClient();
  const { unit } = useUnit();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [measuredOn, setMeasuredOn] = useState(today);
  const [weight, setWeight] = useState("");
  const entries = useQuery({
    queryKey: ["body-weights", "year"],
    queryFn: () => listBodyWeights(addDays(today, -365), today),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["body-weights"] });
  const create = useMutation({ mutationFn: createBodyWeight, onSuccess: refresh });
  const update = useMutation({
    mutationFn: ({ id, weightKg }: { id: string; weightKg: number }) =>
      updateBodyWeight(id, { weightKg }),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: deleteBodyWeight, onSuccess: refresh });

  function canonicalWeight(value: string): number {
    const parsed = Number(value);
    return unit === "LB" ? parsed / LB_PER_KG : parsed;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate(
      { measuredOn, weightKg: canonicalWeight(weight) },
      { onSuccess: () => setWeight("") },
    );
  }

  return (
    <main className="progress-page">
      <header className="planning-heading">
        <p className="eyebrow">Body metrics</p>
        <h1>Track the trend, not the noise</h1>
      </header>
      <section className="body-weight-layout">
        <form className="planning-panel planning-form" onSubmit={submit}>
          <h2>Add measurement</h2>
          <label>
            Date
            <input
              max={today}
              onChange={(event) => setMeasuredOn(event.target.value)}
              required
              type="date"
              value={measuredOn}
            />
          </label>
          <label>
            Weight ({unit.toLowerCase()})
            <input
              inputMode="decimal"
              min="1"
              onChange={(event) => setWeight(event.target.value)}
              required
              step="0.1"
              type="number"
              value={weight}
            />
          </label>
          <button className="button button-primary" disabled={create.isPending} type="submit">
            Save measurement
          </button>
          {create.isError ? (
            <p className="form-error" role="alert">
              {create.error.message}
            </p>
          ) : null}
        </form>
        <div className="planning-panel">
          <h2>Measurements</h2>
          {entries.isPending ? <p role="status">Loading measurements…</p> : null}
          {entries.data?.data.length === 0 ? <p>No measurements yet.</p> : null}
          <ul className="body-weight-list">
            {[...(entries.data?.data ?? [])].reverse().map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>
                    {displayMass(entry.weightKg, unit)} {unit.toLowerCase()}
                  </strong>
                  <small>{entry.measuredOn}</small>
                </div>
                <div className="row-actions">
                  <button
                    onClick={() => {
                      const next = window.prompt(
                        `New weight (${unit.toLowerCase()})`,
                        String(displayMass(entry.weightKg, unit)),
                      );
                      if (next) update.mutate({ id: entry.id, weightKg: canonicalWeight(next) });
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button onClick={() => remove.mutate(entry.id)} type="button">
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
