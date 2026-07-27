import {
  apiErrorResponseSchema,
  authResponseSchema,
  meResponseSchema,
} from "@gym-tracking/contracts";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { UserModel } from "../src/modules/users/user.model.js";
import { TEST_AUTH_CONFIG } from "./test-config.js";

const TEST_MONGODB_URI =
  process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017/gym_tracking_phase3_test";

if (!/_test(?:\?|$)/.test(TEST_MONGODB_URI)) {
  throw new Error("TEST_MONGODB_URI must target a database ending in _test");
}

function buildApp() {
  return createApp({
    auth: TEST_AUTH_CONFIG,
    databaseStatus: () => "connected",
    webOrigin: "http://localhost:5173",
  });
}

async function register(email: string, password = "correct horse battery staple") {
  return request(buildApp()).post("/api/v1/auth/register").send({ email, password });
}

beforeAll(async () => {
  await connectDatabase(TEST_MONGODB_URI);
  await UserModel.syncIndexes();
});

beforeEach(async () => {
  await UserModel.deleteMany({});
});

afterAll(async () => {
  await UserModel.deleteMany({});
  await disconnectDatabase();
});

describe("register, login, and protected account API", () => {
  it("normalizes a unique email and stores only a scrypt password hash", async () => {
    const response = await register("  Athlete@Example.COM ");

    expect(response.status).toBe(201);
    const parsed = authResponseSchema.parse(response.body);
    expect(parsed.data.user).toMatchObject({
      email: "athlete@example.com",
      preferences: {
        locale: "vi",
        theme: "SYSTEM",
        unit: "KG",
      },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/password|scrypt/i);

    const storedUser = await UserModel.findOne({ normalizedEmail: "athlete@example.com" })
      .select("+passwordHash")
      .lean();
    expect(storedUser?.passwordHash).toMatch(/^scrypt\$/);
    expect(storedUser?.passwordHash).not.toContain("correct horse battery staple");
  });

  it("rejects a duplicate normalized email without leaking database details", async () => {
    await register("athlete@example.com");
    const response = await register("ATHLETE@example.com");

    expect(response.status).toBe(409);
    expect(apiErrorResponseSchema.parse(response.body)).toEqual({
      error: {
        code: "CONFLICT",
        message: "Account already exists",
      },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/duplicate|index|mongo|normalizedEmail/i);
  });

  it("returns the same generic error for an unknown email and an incorrect password", async () => {
    await register("athlete@example.com");

    const wrongPassword = await request(buildApp()).post("/api/v1/auth/login").send({
      email: "athlete@example.com",
      password: "this password is incorrect",
    });
    const unknownEmail = await request(buildApp()).post("/api/v1/auth/login").send({
      email: "unknown@example.com",
      password: "this password is incorrect",
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(apiErrorResponseSchema.parse(wrongPassword.body)).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Invalid email or password",
      },
    });
  });

  it("returns an access token for valid credentials and scopes /me to its subject", async () => {
    await register("first@example.com");
    await register("second@example.com");

    const firstLogin = await request(buildApp()).post("/api/v1/auth/login").send({
      email: "FIRST@example.com",
      password: "correct horse battery staple",
    });
    const secondLogin = await request(buildApp()).post("/api/v1/auth/login").send({
      email: "second@example.com",
      password: "correct horse battery staple",
    });

    expect(firstLogin.status).toBe(200);
    expect(secondLogin.status).toBe(200);
    const firstAuth = authResponseSchema.parse(firstLogin.body);
    const secondAuth = authResponseSchema.parse(secondLogin.body);

    const firstMe = await request(buildApp())
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${firstAuth.data.accessToken}`);
    const secondMe = await request(buildApp())
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${secondAuth.data.accessToken}`);

    expect(firstMe.status).toBe(200);
    expect(secondMe.status).toBe(200);
    expect(meResponseSchema.parse(firstMe.body).data.user.email).toBe("first@example.com");
    expect(meResponseSchema.parse(secondMe.body).data.user.email).toBe("second@example.com");
    expect(firstAuth.data.user.id).not.toBe(secondAuth.data.user.id);
  });

  it("rejects missing, malformed, and invalid bearer tokens", async () => {
    const missing = await request(buildApp()).get("/api/v1/me");
    const malformed = await request(buildApp())
      .get("/api/v1/me")
      .set("Authorization", "Bearer not-a-jwt");
    const wrongScheme = await request(buildApp())
      .get("/api/v1/me")
      .set("Authorization", "Basic credentials");

    for (const response of [missing, malformed, wrongScheme]) {
      expect(response.status).toBe(401);
      expect(apiErrorResponseSchema.parse(response.body)).toEqual({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      });
    }
  });

  it("validates request bodies and rejects client-supplied ownership fields", async () => {
    const response = await request(buildApp()).post("/api/v1/auth/register").send({
      email: "not-an-email",
      password: "short",
      userId: "another-user",
    });

    expect(response.status).toBe(422);
    const body = apiErrorResponseSchema.parse(response.body);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toHaveProperty("fields");
  });

  it("updates only the authenticated account preferences", async () => {
    const first = await register("first@example.com");
    const second = await register("second@example.com");
    const firstAuth = authResponseSchema.parse(first.body);
    const secondAuth = authResponseSchema.parse(second.body);

    const updated = await request(buildApp())
      .patch("/api/v1/me/preferences")
      .set("Authorization", `Bearer ${firstAuth.data.accessToken}`)
      .send({ locale: "en", theme: "DARK", unit: "LB" });

    expect(updated.status).toBe(200);
    expect(meResponseSchema.parse(updated.body).data.user.preferences).toEqual({
      locale: "en",
      theme: "DARK",
      unit: "LB",
    });

    const secondMe = await request(buildApp())
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${secondAuth.data.accessToken}`);
    expect(meResponseSchema.parse(secondMe.body).data.user.preferences).toEqual({
      locale: "vi",
      theme: "SYSTEM",
      unit: "KG",
    });
  });

  it("rejects invalid or empty preference patches", async () => {
    const registered = await register("preferences@example.com");
    const auth = authResponseSchema.parse(registered.body);

    for (const input of [{ locale: "fr" }, {}, { unit: "STONE" }]) {
      const response = await request(buildApp())
        .patch("/api/v1/me/preferences")
        .set("Authorization", `Bearer ${auth.data.accessToken}`)
        .send(input);
      expect(response.status).toBe(422);
      expect(apiErrorResponseSchema.parse(response.body).error.code).toBe("VALIDATION_ERROR");
    }
  });
});
