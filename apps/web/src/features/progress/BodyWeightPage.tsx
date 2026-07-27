import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import type { BodyWeight } from "@gym-tracking/contracts";

import { Button } from "../../components/ui/Button.js";
import { Dialog } from "../../components/ui/Dialog.js";
import { Input } from "../../components/ui/Input.js";
import { useI18n } from "../../i18n/i18n-context.js";
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
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { unit } = useUnit();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [measuredOn, setMeasuredOn] = useState(today);
  const [weight, setWeight] = useState("");
  const [editing, setEditing] = useState<BodyWeight | null>(null);
  const [editingWeight, setEditingWeight] = useState("");
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
        <p className="eyebrow">{t("progress", "bodyMetricsEyebrow")}</p>
        <h1>{t("progress", "bodyMetricsTitle")}</h1>
      </header>
      <section className="body-weight-layout">
        <form className="planning-panel planning-form" onSubmit={submit}>
          <h2>{t("progress", "addMeasurement")}</h2>
          <Input
            label={t("progress", "date")}
            max={today}
            onChange={(event) => setMeasuredOn(event.target.value)}
            required
            type="date"
            value={measuredOn}
          />
          <Input
            inputMode="decimal"
            label={`${t("progress", "weight")} (${unit.toLowerCase()})`}
            min="1"
            onChange={(event) => setWeight(event.target.value)}
            required
            step="0.1"
            type="number"
            value={weight}
          />
          <Button isLoading={create.isPending} loadingLabel={t("progress", "saving")} type="submit">
            {t("progress", "saveMeasurement")}
          </Button>
          {create.isError ? (
            <p className="form-error" role="alert">
              {t("progress", "saveMeasurementError")}
            </p>
          ) : null}
        </form>
        <div className="planning-panel">
          <h2>{t("progress", "measurements")}</h2>
          {entries.isPending ? <p role="status">{t("progress", "loadingMeasurements")}</p> : null}
          {entries.data?.data.length === 0 ? <p>{t("progress", "noMeasurements")}</p> : null}
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
                      setEditing(entry);
                      setEditingWeight(String(displayMass(entry.weightKg, unit)));
                    }}
                    type="button"
                  >
                    {t("progress", "edit")}
                  </button>
                  <button onClick={() => remove.mutate(entry.id)} type="button">
                    {t("progress", "delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <Dialog
        closeLabel={t("progress", "closeDialog")}
        description={`${t("progress", "measurementFrom")} ${editing?.measuredOn ?? ""}`}
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={t("progress", "editBodyWeight")}
      >
        <form
          className="dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!editing) return;
            update.mutate(
              { id: editing.id, weightKg: canonicalWeight(editingWeight) },
              { onSuccess: () => setEditing(null) },
            );
          }}
        >
          <Input
            autoFocus
            inputMode="decimal"
            label={`${t("progress", "weight")} (${unit.toLowerCase()})`}
            min="1"
            onChange={(event) => setEditingWeight(event.target.value)}
            required
            step="0.1"
            type="number"
            value={editingWeight}
          />
          <div className="dialog-actions">
            <Button onClick={() => setEditing(null)} variant="secondary">
              {t("progress", "cancel")}
            </Button>
            <Button
              isLoading={update.isPending}
              loadingLabel={t("progress", "saving")}
              type="submit"
            >
              {t("progress", "save")}
            </Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}
