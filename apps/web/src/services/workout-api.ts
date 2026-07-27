import {
  workoutHistoryResponseSchema,
  workoutResponseSchema,
  type CreateWorkoutDraftRequest,
  type UpdateWorkoutDraftRequest,
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

export async function getActiveWorkout() {
  try {
    return await request("/workouts/draft", workoutResponseSchema);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) return null;
    throw error;
  }
}

export function createWorkoutDraft(input: CreateWorkoutDraftRequest) {
  return request("/workouts/draft", workoutResponseSchema, json("POST", input));
}

export function updateWorkoutDraft(id: string, input: UpdateWorkoutDraftRequest) {
  return request(`/workouts/${id}`, workoutResponseSchema, json("PATCH", input));
}

export function completeWorkout(id: string, version: number) {
  return request(`/workouts/${id}/complete`, workoutResponseSchema, json("POST", { version }));
}

export function cancelWorkout(id: string, version: number) {
  return request(`/workouts/${id}/cancel`, workoutResponseSchema, json("POST", { version }));
}

export function listWorkoutHistory(page = 1, pageSize = 20) {
  return request(
    `/workouts?page=${page}&pageSize=${pageSize}`,
    workoutHistoryResponseSchema,
  );
}

export function getWorkout(id: string) {
  return request(`/workouts/${id}`, workoutResponseSchema);
}
