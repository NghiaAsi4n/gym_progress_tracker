import type { ApiErrorResponse, HealthResponse } from "@gym-tracking/contracts";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";

import type { DatabaseStatus } from "./config/database.js";
import { createAuthenticateMiddleware } from "./modules/auth/auth.middleware.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createAuthService } from "./modules/auth/auth.service.js";
import { createPasswordService } from "./modules/auth/password.service.js";
import { createTokenService, type AuthTokenConfig } from "./modules/auth/token.service.js";
import { createUserRouter } from "./modules/users/user.routes.js";
import { createUserRepository } from "./modules/users/user.repository.js";
import { createUserService } from "./modules/users/user.service.js";
import { ApiError } from "./shared/api-error.js";

interface AppOptions {
  auth: AuthTokenConfig & {
    passwordScryptCost?: number;
  };
  databaseStatus: () => DatabaseStatus;
  webOrigin: string;
}

export function createApp(options: AppOptions) {
  const app = express();
  const tokenService = createTokenService(options.auth);
  const passwordService = createPasswordService(
    options.auth.passwordScryptCost === undefined ? {} : { cost: options.auth.passwordScryptCost },
  );
  const userRepository = createUserRepository();
  const authService = createAuthService({
    passwordService,
    tokenService,
    userRepository,
  });
  const authenticate = createAuthenticateMiddleware(tokenService);
  const userService = createUserService(userRepository);

  app.disable("x-powered-by");
  app.use(
    cors({
      credentials: true,
      origin: options.webOrigin,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use("/api/v1/auth", createAuthRouter(authService));
  app.use("/api/v1/me", createUserRouter(authenticate, userService));

  app.get("/api/v1/health", (_request, response) => {
    const database = options.databaseStatus();
    const body: HealthResponse = {
      data: {
        status: database === "connected" ? "ok" : "unavailable",
        timestamp: new Date().toISOString(),
        services: {
          api: "up",
          database,
        },
      },
    };

    response.status(database === "connected" ? 200 : 503).json(body);
  });

  app.use("/api/v1/{*path}", (_request, response) => {
    const body: ApiErrorResponse = {
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
      },
    };
    response.status(404).json(body);
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction): void => {
    if (error instanceof ApiError) {
      response.status(error.status).json(error.toResponse());
      return;
    }

    console.error("Unhandled API error");
    const body: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    };
    response.status(500).json(body);
  });

  return app;
}
