import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";

import { useI18n } from "../../i18n/i18n-context.js";
import {
  acceptSuggestion,
  createPlan,
  createScheduleOverride,
  deletePlan,
  listPlans,
  listScheduledWorkouts,
  listSuggestions,
  listTemplates,
  updatePlan,
} from "../../services/planning-api.js";
import { CalendarPanel, PlansPanel, SuggestionsPanel } from "./TrainingPlannerPanels.js";

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function TrainingPlannerPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const templates = useQuery({ queryKey: ["templates"], queryFn: listTemplates });
  const plans = useQuery({ queryKey: ["plans"], queryFn: listPlans });
  const calendar = useQuery({
    queryKey: ["calendar", today],
    queryFn: () =>
      listScheduledWorkouts(
        today,
        addDays(today, 7),
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      ),
  });
  const planId =
    selectedPlanId ??
    plans.data?.data.find(({ isActive }) => isActive)?.id ??
    calendar.data?.data[0]?.planId ??
    null;
  const suggestions = useQuery({
    queryKey: ["suggestions", planId],
    queryFn: () => listSuggestions(planId!),
    enabled: false,
  });
  const create = useMutation({
    mutationFn: createPlan,
    onSuccess: ({ data }) => {
      setSelectedPlanId(data.id);
      void queryClient.invalidateQueries({ queryKey: ["plans"] });
      void queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
  const override = useMutation({
    mutationFn: createScheduleOverride,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar"] }),
  });
  const changePlan = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updatePlan(id, { isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plans"] });
      void queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
  const removePlan = useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      setSelectedPlanId(null);
      void queryClient.invalidateQueries({ queryKey: ["plans"] });
      void queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
  const accept = useMutation({
    mutationFn: ({
      currentPlanId,
      exerciseId,
      targetTemplateId,
    }: {
      currentPlanId: string;
      exerciseId: string;
      targetTemplateId: string;
    }) => acceptSuggestion(currentPlanId, exerciseId, targetTemplateId),
    onSuccess: () => {
      void suggestions.refetch();
      void queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate({
      name,
      goal: "GENERAL",
      experienceLevel: "BEGINNER",
      daysPerWeek: 1,
      durationMinutes: 45,
      availableEquipment: ["BODYWEIGHT", "BARBELL"],
      schedule: [{ dayOfWeek: "MONDAY", templateId }],
    });
  }

  return (
    <main className="planning-page">
      <header className="planning-heading">
        <p className="eyebrow">{t("planning", "plannerEyebrow")}</p>
        <h1>{t("planning", "plannerTitle")}</h1>
      </header>
      <section className="planning-grid">
        <form className="planning-panel planning-form" onSubmit={submit}>
          <h2>{t("planning", "createActivePlan")}</h2>
          <label>
            {t("planning", "planName")}
            <input onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <label>
            {t("planning", "mondayTemplate")}
            <select
              onChange={(event) => setTemplateId(event.target.value)}
              required
              value={templateId}
            >
              <option value="">{t("planning", "chooseTemplate")}</option>
              {templates.data?.data.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button button-primary" type="submit">
            {t("planning", "createPlan")}
          </button>
        </form>
        <CalendarPanel
          isLoading={calendar.isPending}
          onMove={(workout) =>
            override.mutate({
              planId: workout.planId,
              scheduledDate: workout.scheduledDate,
              action: "RESCHEDULE",
              rescheduledDate: addDays(workout.scheduledDate, 1),
            })
          }
          onSkip={(workout) =>
            override.mutate({
              planId: workout.planId,
              scheduledDate: workout.scheduledDate,
              action: "SKIP",
            })
          }
          onViewSuggestions={() => void suggestions.refetch()}
          planId={planId}
          workouts={calendar.data?.data ?? []}
        />
      </section>
      <PlansPanel
        onActivate={(id) => {
          setSelectedPlanId(id);
          changePlan.mutate({ id, isActive: true });
        }}
        onDelete={(id) => removePlan.mutate(id)}
        plans={plans.data?.data ?? []}
      />
      <SuggestionsPanel
        onAccept={(suggestion) => {
          if (planId && suggestion.suggestedTemplateId) {
            accept.mutate({
              currentPlanId: planId,
              exerciseId: suggestion.exerciseId,
              targetTemplateId: suggestion.suggestedTemplateId,
            });
          }
        }}
        suggestions={suggestions.data?.data ?? null}
      />
    </main>
  );
}
