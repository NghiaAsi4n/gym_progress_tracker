import type { ApiErrorResponse, HealthResponse } from "@gym-tracking/contracts";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { existsSync } from "node:fs";
import { join, sep } from "node:path";

import type { DatabaseStatus } from "./config/database.js";
import {
  createRateLimiter,
  createSecurityHeaders,
  enforceRequestLimits,
  handleBodyParserError,
} from "./middleware/security.js";
import { createAuthenticateMiddleware } from "./modules/auth/auth.middleware.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createAuthService } from "./modules/auth/auth.service.js";
import { createPasswordService } from "./modules/auth/password.service.js";
import { createRefreshService } from "./modules/auth/refresh.service.js";
import { createTokenService, type AuthTokenConfig } from "./modules/auth/token.service.js";
import { createExerciseRepository } from "./modules/exercises/exercise.repository.js";
import { createExerciseRouter } from "./modules/exercises/exercise.routes.js";
import { createExerciseService } from "./modules/exercises/exercise.service.js";
import {
  createBodyWeightRouter,
  createBodyWeightService,
} from "./modules/body-weight/body-weight.module.js";
import { createProgressRouter, createProgressService } from "./modules/progress/progress.module.js";
import { createUserRouter } from "./modules/users/user.routes.js";
import { createUserRepository } from "./modules/users/user.repository.js";
import { createUserService } from "./modules/users/user.service.js";
import {
  createWorkoutTemplateRouter,
  createWorkoutTemplateService,
} from "./modules/workout-templates/workout-template.module.js";
import { createWorkoutRouter } from "./modules/workouts/workout.routes.js";
import { createWorkoutService } from "./modules/workouts/workout.service.js";
import {
  createScheduleRouter,
  createTrainingPlanRouter,
  createTrainingPlanService,
} from "./modules/training-plans/training-plan.module.js";
import { ApiError } from "./shared/api-error.js";

interface AppOptions {
  auth: AuthTokenConfig & {
    passwordScryptCost?: number;
  };
  databaseStatus: () => DatabaseStatus;
  nodeEnv?: "development" | "test" | "production";
  webDistPath?: string;
  webOrigin: string;
}

export function createApp(options: AppOptions) {
  const app = express();
  const tokenService = createTokenService(options.auth);
  const passwordService = createPasswordService(
    options.auth.passwordScryptCost === undefined ? {} : { cost: options.auth.passwordScryptCost },
  );
  const userRepository = createUserRepository();
  const refreshService = createRefreshService(tokenService, userRepository, {
    refreshTokenTtlSeconds: options.auth.refreshTokenTtlSeconds,
  });
  const authService = createAuthService({
    passwordService,
    refreshService,
    tokenService,
    userRepository,
  });
  const authenticate = createAuthenticateMiddleware(tokenService);
  const userService = createUserService(userRepository);
  const workoutTemplateService = createWorkoutTemplateService();
  const trainingPlanService = createTrainingPlanService(workoutTemplateService);
  const workoutService = createWorkoutService(workoutTemplateService, trainingPlanService);
  const bodyWeightService = createBodyWeightService();
  const progressService = createProgressService();
  const exerciseRepository = createExerciseRepository();
  const exerciseService = createExerciseService(exerciseRepository, (userId, exerciseId) =>
    workoutTemplateService.isExerciseReferenced(userId, exerciseId),
  );

  app.disable("x-powered-by");
  app.use(createSecurityHeaders(options.nodeEnv ?? "development"));
  app.use(
    cors({
      allowedHeaders: ["Accept", "Authorization", "Content-Type"],
      credentials: true,
      maxAge: 600,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      origin: options.webOrigin,
    }),
  );
  app.use(enforceRequestLimits);
  app.use("/api/v1", createRateLimiter({ max: 300, windowMs: 15 * 60 * 1_000 }));
  app.use(express.json({ limit: "100kb" }));
  app.use(handleBodyParserError);
  app.use(
    "/api/v1/auth",
    createRateLimiter({ max: 30, windowMs: 15 * 60 * 1_000 }),
    createAuthRouter(authService, refreshService, options.webOrigin),
  );
  app.use("/api/v1/me", createUserRouter(authenticate, userService));
  app.use("/api/v1/exercises", createExerciseRouter(authenticate, exerciseService));
  app.use(
    "/api/v1/workout-templates",
    createWorkoutTemplateRouter(authenticate, workoutTemplateService),
  );
  app.use("/api/v1/training-plans", createTrainingPlanRouter(authenticate, trainingPlanService));
  app.use("/api/v1/workouts", createWorkoutRouter(authenticate, workoutService));
  app.use("/api/v1/body-weights", createBodyWeightRouter(authenticate, bodyWeightService));
  app.use("/api/v1/progress", createProgressRouter(authenticate, progressService));
  const scheduleRouters = createScheduleRouter(authenticate, trainingPlanService);
  app.use("/api/v1/scheduled-workouts", scheduleRouters.scheduled);
  app.use("/api/v1/schedule-overrides", scheduleRouters.overrides);

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

  if (options.webDistPath) {
    const indexPath = join(options.webDistPath, "index.html");

    if (existsSync(indexPath)) {
      const assetPathSegment = `${sep}assets${sep}`;

      app.use(
        express.static(options.webDistPath, {
          fallthrough: true,
          index: false,
          setHeaders: (response, filePath) => {
            response.setHeader(
              "Cache-Control",
              filePath.includes(assetPathSegment)
                ? "public, max-age=31536000, immutable"
                : "no-cache",
            );
          },
        }),
      );
      app.get("/{*path}", (_request, response) => {
        response.setHeader("Cache-Control", "no-cache");
        response.sendFile(indexPath);
      });
    }
  }

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
