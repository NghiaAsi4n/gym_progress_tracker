import {
  authResponseSchema,
  meResponseSchema,
  preferencesResponseSchema,
  type AuthResponse,
  type LoginRequest,
  type PreferencesPatchRequest,
  type RegisterRequest,
  type UserPreferences,
} from "@gym-tracking/contracts";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

async function parseResponse<T>(response: Response, parse: (payload: unknown) => T): Promise<T> {
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error =
      typeof payload === "object" && payload !== null && "error" in payload
        ? (payload as { error?: { message?: string; code?: string } }).error
        : undefined;
    throw new ApiClientError(error?.message ?? "Request failed", response.status, error?.code);
  }
  return parse(payload);
}

function withJson(body: unknown, init?: RequestInit): RequestInit {
  return {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: JSON.stringify(body),
  };
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}

async function requestAuth(path: string, body: unknown): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}${path}`, withJson(body, { method: "POST" }));
  const result = await parseResponse(response, (payload) => authResponseSchema.parse(payload));
  accessToken = result.data.accessToken;
  return result;
}

export function login(input: LoginRequest): Promise<AuthResponse> {
  return requestAuth("/auth/login", input);
}

export function register(input: RegisterRequest): Promise<AuthResponse> {
  return requestAuth("/auth/register", input);
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        accessToken = null;
        return null;
      }
      const result = await parseResponse(response, (payload) => authResponseSchema.parse(payload));
      accessToken = result.data.accessToken;
      return accessToken;
    } catch {
      accessToken = null;
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    method: "POST",
  });
  accessToken = null;
}

export async function getMe(): Promise<ReturnType<typeof meResponseSchema.parse>> {
  const response = await authenticatedFetch("/me");
  return parseResponse(response, (payload) => meResponseSchema.parse(payload));
}

export async function updatePreferences(
  input: PreferencesPatchRequest,
): Promise<ReturnType<typeof preferencesResponseSchema.parse>> {
  const response = await authenticatedFetch(
    "/me/preferences",
    withJson(input, { method: "PATCH" }),
  );
  return parseResponse(response, (payload) => preferencesResponseSchema.parse(payload));
}

export async function authenticatedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const makeRequest = () => {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    return fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers,
    });
  };

  let response = await makeRequest();
  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    return response;
  }

  response = await makeRequest();
  return response;
}

export type { AuthResponse, UserPreferences };
