import type { ApiErrorResponse, HealthResponse } from "@gym-tracking/contracts";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";

import type { DatabaseStatus } from "./config/database.js";

interface AppOptions {
  databaseStatus: () => DatabaseStatus;
  webOrigin: string;
}

export function createApp(options: AppOptions) {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      credentials: true,
      origin: options.webOrigin,
    }),
  );
  app.use(express.json({ limit: "100kb" }));

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

  app.use((_error: unknown, _request: Request, response: Response, _next: NextFunction): void => {
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
