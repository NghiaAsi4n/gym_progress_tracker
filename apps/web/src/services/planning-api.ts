import {
  exerciseListResponseSchema,
  exerciseResponseSchema,
  workoutTemplateListResponseSchema,
  workoutTemplateResponseSchema,
  type CreateExerciseRequest,
  type CreateWorkoutTemplateRequest,
  type ExerciseQuery,
  type UpdateExerciseRequest,
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
