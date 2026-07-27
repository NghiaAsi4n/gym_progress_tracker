import { loginRequestSchema, registerRequestSchema } from "@gym-tracking/contracts";
import { parseCookie } from "cookie";
import type { Request, Response } from "express";

import { ApiError } from "../../shared/api-error.js";
import { validateInput } from "../../shared/validate.js";
import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  type RefreshService,
} from "./refresh.service.js";
import type { AuthService } from "./auth.service.js";

function readRefreshCookie(request: Request): string | undefined {
  const header = request.headers.cookie;
  return header ? parseCookie(header)[REFRESH_COOKIE_NAME] : undefined;
}

function setRefreshCookie(response: Response, token: string, maxAge: number): void {
  response.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge,
    path: REFRESH_COOKIE_PATH,
    sameSite: "lax",
    secure: true,
  });
}

function clearRefreshCookie(response: Response): void {
  response.cookie(REFRESH_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: REFRESH_COOKIE_PATH,
    sameSite: "lax",
    secure: true,
  });
}

function assertTrustedOrigin(request: Request, webOrigin: string): void {
  if (request.header("Origin") !== webOrigin) {
    throw new ApiError("FORBIDDEN", "Request origin not allowed");
  }
}

export function createAuthController(
  authService: AuthService,
  refreshService: RefreshService,
  webOrigin: string,
) {
  return {
    login: async (request: Request, response: Response): Promise<void> => {
      assertTrustedOrigin(request, webOrigin);
      const input = validateInput(loginRequestSchema, request.body);
      const result = await authService.login(input);
      setRefreshCookie(response, result.refreshToken, refreshService.refreshCookieMaxAgeMs());
      response.status(200).json(result.auth);
    },

    register: async (request: Request, response: Response): Promise<void> => {
      assertTrustedOrigin(request, webOrigin);
      const input = validateInput(registerRequestSchema, request.body);
      const result = await authService.register(input);
      setRefreshCookie(response, result.refreshToken, refreshService.refreshCookieMaxAgeMs());
      response.status(201).json(result.auth);
    },

    refresh: async (request: Request, response: Response): Promise<void> => {
      assertTrustedOrigin(request, webOrigin);
      const token = readRefreshCookie(request);

      if (!token) {
        clearRefreshCookie(response);
        response.status(401).json({
          error: { code: "UNAUTHENTICATED", message: "Authentication required" },
        });
        return;
      }

      const result = await refreshService.refresh(token);
      setRefreshCookie(response, result.refreshToken, refreshService.refreshCookieMaxAgeMs());
      response.status(200).json(result.auth);
    },

    logout: async (request: Request, response: Response): Promise<void> => {
      assertTrustedOrigin(request, webOrigin);
      await refreshService.logout(readRefreshCookie(request));
      clearRefreshCookie(response);
      response.status(204).end();
    },
  };
}
