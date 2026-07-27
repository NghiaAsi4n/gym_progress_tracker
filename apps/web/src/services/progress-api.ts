import {
  bodyWeightListResponseSchema,
  bodyWeightResponseSchema,
  calorieEstimateResponseSchema,
  exerciseProgressResponseSchema,
  type CreateBodyWeightRequest,
  type UpdateBodyWeightRequest,
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

export function listExerciseProgress(from: string, to: string) {
  return request(
    `/progress/exercises?${new URLSearchParams({ from, to })}`,
    exerciseProgressResponseSchema,
  );
}

export function listBodyWeights(from: string, to: string) {
  return request(
    `/body-weights?${new URLSearchParams({ from, to })}`,
    bodyWeightListResponseSchema,
  );
}

export function createBodyWeight(input: CreateBodyWeightRequest) {
  return request("/body-weights", bodyWeightResponseSchema, json("POST", input));
}

export function updateBodyWeight(id: string, input: UpdateBodyWeightRequest) {
  return request(`/body-weights/${id}`, bodyWeightResponseSchema, json("PATCH", input));
}

export async function deleteBodyWeight(id: string) {
  const response = await authenticatedFetch(`/body-weights/${id}`, { method: "DELETE" });
  if (!response.ok) throw new ApiClientError("Unable to delete entry", response.status);
}

export function recalculateCalories(workoutId: string) {
  return request(
    `/progress/calorie-estimates/${workoutId}`,
    calorieEstimateResponseSchema,
    { method: "POST" },
  );
}
