import { apiErrorResponseSchema, healthResponseSchema } from "@gym-tracking/contracts";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { loadRootEnvFile, parseEnv } from "../src/config/env.js";

describe("API foundation", () => {
  it("returns a contract-valid health response when MongoDB is connected", async () => {
    const response = await request(
      createApp({
        databaseStatus: () => "connected",
        webOrigin: "http://localhost:5173",
      }),
    ).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(healthResponseSchema.parse(response.body).data).toMatchObject({
      status: "ok",
      services: {
        api: "up",
        database: "connected",
      },
    });
  });

  it("allows the configured web origin to read the health response", async () => {
    const response = await request(
      createApp({
        databaseStatus: () => "connected",
        webOrigin: "http://localhost:5173",
      }),
    )
      .get("/api/v1/health")
      .set("Origin", "http://localhost:5173");

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("returns 503 with a contract-valid health response when MongoDB is disconnected", async () => {
    const response = await request(
      createApp({
        databaseStatus: () => "disconnected",
        webOrigin: "http://localhost:5173",
      }),
    ).get("/api/v1/health");

    expect(response.status).toBe(503);
    expect(healthResponseSchema.parse(response.body).data).toMatchObject({
      status: "unavailable",
      services: {
        api: "up",
        database: "disconnected",
      },
    });
  });

  it("uses the shared error response for unknown API routes", async () => {
    const response = await request(
      createApp({
        databaseStatus: () => "connected",
        webOrigin: "http://localhost:5173",
      }),
    ).get("/api/v1/unknown");

    expect(response.status).toBe(404);
    expect(apiErrorResponseSchema.parse(response.body)).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
      },
    });
  });

  it("fails fast and names invalid environment fields without echoing values", () => {
    let thrown: unknown;

    try {
      parseEnv({
        MONGODB_URI: "not-a-mongodb-uri",
        PORT: "70000",
        WEB_ORIGIN: "not-a-url",
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    const message = (thrown as Error).message;
    expect(message).toContain("MONGODB_URI");
    expect(message).toContain("PORT");
    expect(message).toContain("WEB_ORIGIN");
    expect(message).not.toContain("not-a-mongodb-uri");
  });

  it("uses reproducible local defaults when optional environment fields are absent", () => {
    expect(parseEnv({})).toEqual({
      NODE_ENV: "development",
      PORT: 4000,
      MONGODB_URI: "mongodb://127.0.0.1:27017/gym_tracking",
      WEB_ORIGIN: "http://localhost:5173",
    });
  });

  it("does not require a root .env file", () => {
    expect(() => loadRootEnvFile()).not.toThrow();
  });

  it("rejects a syntactically valid non-HTTP web origin", () => {
    expect(() =>
      parseEnv({
        MONGODB_URI: "mongodb://127.0.0.1:27017/gym_tracking",
        WEB_ORIGIN: "ftp://example.com",
      }),
    ).toThrowError(/WEB_ORIGIN/);
  });
});
