import {
  exerciseListResponseSchema,
  exerciseResponseSchema,
  exerciseSuggestionListResponseSchema,
  scheduledWorkoutListResponseSchema,
  trainingPlanListResponseSchema,
  trainingPlanResponseSchema,
  workoutTemplateListResponseSchema,
  workoutTemplateResponseSchema,
  type CreateExerciseRequest,
  type CreateTrainingPlanRequest,
  type CreateWorkoutTemplateRequest,
  type ExerciseQuery,
  type ScheduleOverrideRequest,
  type UpdateExerciseRequest,
  type UpdateTrainingPlanRequest,
  type UpdateWorkoutTemplateRequest,
} from "@gym-tracking/contracts";
import type { z } from "zod";

import { ApiClientError, authenticatedFetch } from "./api-auth.js";

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(path, init);
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error =
      typeof payload === "object" && payload !== null && "error" in payload
        ? (payload as { error?: { message?: string; code?: string } }).error
        : undefined;
    throw new ApiClientError(error?.message ?? "Request failed", response.status, error?.code);
  }
  return schema.parse(payload);
}

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function listExercises(query: Partial<ExerciseQuery> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return request(`/exercises?${params.toString()}`, exerciseListResponseSchema);
}
export function createExercise(input: CreateExerciseRequest) {
  return request("/exercises", exerciseResponseSchema, json("POST", input));
}
export function updateExercise(id: string, input: UpdateExerciseRequest) {
  return request(`/exercises/${id}`, exerciseResponseSchema, json("PATCH", input));
}
export async function deleteExercise(id: string) {
  const response = await authenticatedFetch(`/exercises/${id}`, { method: "DELETE" });
  if (!response.ok) throw new ApiClientError("Unable to delete exercise", response.status);
}

export function listTemplates() {
  return request("/workout-templates", workoutTemplateListResponseSchema);
}
export function createTemplate(input: CreateWorkoutTemplateRequest) {
  return request("/workout-templates", workoutTemplateResponseSchema, json("POST", input));
}
export function updateTemplate(id: string, input: UpdateWorkoutTemplateRequest) {
  return request(`/workout-templates/${id}`, workoutTemplateResponseSchema, json("PATCH", input));
}
export async function deleteTemplate(id: string) {
  const response = await authenticatedFetch(`/workout-templates/${id}`, { method: "DELETE" });
  if (!response.ok) throw new ApiClientError("Unable to delete template", response.status);
}

export function listPlans() {
  return request("/training-plans", trainingPlanListResponseSchema);
}
export function createPlan(input: CreateTrainingPlanRequest) {
  return request("/training-plans", trainingPlanResponseSchema, json("POST", input));
}
export function updatePlan(id: string, input: UpdateTrainingPlanRequest) {
  return request(`/training-plans/${id}`, trainingPlanResponseSchema, json("PATCH", input));
}
export async function deletePlan(id: string) {
  const response = await authenticatedFetch(`/training-plans/${id}`, { method: "DELETE" });
  if (!response.ok) throw new ApiClientError("Unable to delete plan", response.status);
}
export function listScheduledWorkouts(from: string, to: string, timeZone: string) {
  const params = new URLSearchParams({ from, to, timeZone });
  return request(`/scheduled-workouts?${params.toString()}`, scheduledWorkoutListResponseSchema);
}
export async function createScheduleOverride(input: ScheduleOverrideRequest) {
  const response = await authenticatedFetch("/schedule-overrides", json("POST", input));
  if (!response.ok) throw new ApiClientError("Unable to update schedule", response.status);
}
export function listSuggestions(planId: string) {
  return request(`/training-plans/${planId}/suggestions`, exerciseSuggestionListResponseSchema);
}
export async function acceptSuggestion(planId: string, exerciseId: string, templateId: string) {
  const response = await authenticatedFetch(
    `/training-plans/${planId}/suggestions/${exerciseId}/accept`,
    json("POST", { templateId }),
  );
  if (!response.ok) throw new ApiClientError("Unable to accept suggestion", response.status);
}
