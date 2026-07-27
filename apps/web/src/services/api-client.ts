import { healthResponseSchema, type HealthResponse } from "@gym-tracking/contracts";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/health`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    signal: signal ?? null,
  });
  const payload: unknown = await response.json();
  const parsed = healthResponseSchema.parse(payload);

  if (!response.ok) {
    throw new Error("API is not ready");
  }

  return parsed;
}
