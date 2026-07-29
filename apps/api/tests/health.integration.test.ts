import { apiErrorResponseSchema, healthResponseSchema } from "@gym-tracking/contracts";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { loadRootEnvFile, parseEnv } from "../src/config/env.js";
import { TEST_AUTH_CONFIG, TEST_ENV_SECRETS } from "./test-config.js";

describe("API foundation", () => {
  it("returns a contract-valid health response when MongoDB is connected", async () => {
    const response = await request(
      createApp({
        auth: TEST_AUTH_CONFIG,
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
        auth: TEST_AUTH_CONFIG,
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
        auth: TEST_AUTH_CONFIG,
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
        auth: TEST_AUTH_CONFIG,
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
        ...TEST_ENV_SECRETS,
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
    expect(parseEnv(TEST_ENV_SECRETS)).toEqual({
      ACCESS_TOKEN_SECRET: TEST_AUTH_CONFIG.accessTokenSecret,
      ACCESS_TOKEN_TTL_SECONDS: 900,
      REFRESH_TOKEN_SECRET: TEST_AUTH_CONFIG.refreshTokenSecret,
      REFRESH_TOKEN_TTL_SECONDS: 604_800,
      NODE_ENV: "development",
      PORT: 4000,
      MONGODB_URI: "mongodb://127.0.0.1:27017/gym_tracking",
      TOKEN_AUDIENCE: "gym-tracking-web",
      TOKEN_ISSUER: "gym-tracking-api",
      WEB_ORIGIN: "http://localhost:5173",
    });
  });

  it("requires separate high-entropy token secrets without echoing them", () => {
    expect(() =>
      parseEnv({
        ACCESS_TOKEN_SECRET: "too-short",
        REFRESH_TOKEN_SECRET: "also-too-short",
      }),
    ).toThrowError(/ACCESS_TOKEN_SECRET.*REFRESH_TOKEN_SECRET/);
  });

  it("requires admin credentials as a complete pair", () => {
    expect(() =>
      parseEnv({
        ...TEST_ENV_SECRETS,
        ADMIN_EMAIL: "admin@example.com",
      }),
    ).toThrowError(/ADMIN_PASSWORD/);
    expect(() =>
      parseEnv({
        ...TEST_ENV_SECRETS,
        ADMIN_PASSWORD: "AdminPassword1!",
      }),
    ).toThrowError(/ADMIN_EMAIL/);
  });

  it("normalizes configured admin credentials", () => {
    expect(
      parseEnv({
        ...TEST_ENV_SECRETS,
        ADMIN_EMAIL: "  Admin@Example.COM ",
        ADMIN_PASSWORD: "AdminPassword1!",
      }),
    ).toMatchObject({
      ADMIN_EMAIL: "admin@example.com",
      ADMIN_PASSWORD: "AdminPassword1!",
    });
  });

  it("treats empty optional admin credentials as unset", () => {
    expect(
      parseEnv({
        ...TEST_ENV_SECRETS,
        ADMIN_EMAIL: "",
        ADMIN_PASSWORD: "",
      }),
    ).toMatchObject({
      ADMIN_EMAIL: undefined,
      ADMIN_PASSWORD: undefined,
    });
  });

  it("does not require a root .env file", () => {
    expect(() => loadRootEnvFile()).not.toThrow();
  });

  it("rejects a syntactically valid non-HTTP web origin", () => {
    expect(() =>
      parseEnv({
        ...TEST_ENV_SECRETS,
        MONGODB_URI: "mongodb://127.0.0.1:27017/gym_tracking",
        WEB_ORIGIN: "ftp://example.com",
      }),
    ).toThrowError(/WEB_ORIGIN/);
  });
});
