import { createHash } from "node:crypto";

import { apiErrorResponseSchema, authResponseSchema } from "@gym-tracking/contracts";
import { parseSetCookie } from "cookie";
import request, { type Response } from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import {
  RefreshSessionModel,
  refreshSessionSchema,
} from "../src/modules/auth/refresh-session.model.js";
import { UserModel } from "../src/modules/users/user.model.js";
import { TEST_AUTH_CONFIG } from "./test-config.js";

const TEST_MONGODB_URI =
  process.env.TEST_REFRESH_MONGODB_URI ?? "mongodb://127.0.0.1:27017/gym_tracking_refresh_test";
const WEB_ORIGIN = "http://localhost:5173";

if (!/_test(?:\?|$)/.test(TEST_MONGODB_URI)) {
  throw new Error("TEST_REFRESH_MONGODB_URI must target a database ending in _test");
}

const app = createApp({
  auth: TEST_AUTH_CONFIG,
  databaseStatus: () => "connected",
  webOrigin: WEB_ORIGIN,
});

interface TestRefreshCookie {
  header: string;
  name: string;
  raw: string;
  setCookie: ReturnType<typeof parseSetCookie>;
}

function readRefreshCookie(response: Response): TestRefreshCookie {
  const header = response.headers["set-cookie"] as unknown;

  if (!Array.isArray(header)) {
    throw new Error("Expected a Set-Cookie response header");
  }

  const serialized = header.find(
    (value): value is string =>
      typeof value === "string" && value.startsWith("__Secure-gym_refresh="),
  );

  if (!serialized) {
    throw new Error("Expected the refresh cookie");
  }

  const parsed = parseSetCookie(serialized);
  if (typeof parsed.value !== "string") {
    throw new Error("Expected a refresh cookie value");
  }
  return {
    header: `${parsed.name}=${parsed.value}`,
    name: parsed.name,
    raw: parsed.value,
    setCookie: parsed,
  };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

async function registerSession(email = "athlete@example.com") {
  const response = await request(app).post("/api/v1/auth/register").send({
    email,
    password: "correct horse battery staple",
  });

  expect(response.status).toBe(201);
  return {
    auth: authResponseSchema.parse(response.body),
    cookie: readRefreshCookie(response),
  };
}

async function refresh(cookie: TestRefreshCookie, origin = WEB_ORIGIN) {
  return request(app)
    .post("/api/v1/auth/refresh")
    .set("Cookie", cookie.header)
    .set("Origin", origin);
}

beforeAll(async () => {
  await connectDatabase(TEST_MONGODB_URI);
  await Promise.all([UserModel.syncIndexes(), RefreshSessionModel.syncIndexes()]);
});

beforeEach(async () => {
  await Promise.all([UserModel.deleteMany({}), RefreshSessionModel.deleteMany({})]);
});

afterAll(async () => {
  await Promise.all([UserModel.deleteMany({}), RefreshSessionModel.deleteMany({})]);
  await disconnectDatabase();
});

describe("refresh rotation and logout", () => {
  it("sets a host-only hardened refresh cookie and stores only its hash", async () => {
    const { cookie } = await registerSession();

    expect(cookie.setCookie).toMatchObject({
      httpOnly: true,
      name: "__Secure-gym_refresh",
      path: "/api/v1/auth",
      sameSite: "lax",
      secure: true,
    });
    expect(cookie.setCookie.domain).toBeUndefined();
    expect(cookie.setCookie.maxAge).toBe(TEST_AUTH_CONFIG.refreshTokenTtlSeconds);

    const stored = await RefreshSessionModel.findOne({
      tokenHash: hashToken(cookie.raw),
    })
      .select("+tokenHash")
      .lean();
    expect(stored).toMatchObject({
      revokedAt: null,
      tokenHash: hashToken(cookie.raw),
    });
    expect(stored?.activatedAt).toBeInstanceOf(Date);
    expect(JSON.stringify(stored)).not.toContain(cookie.raw);

    const indexes = refreshSessionSchema.indexes() as Array<
      [Record<string, number>, Record<string, unknown>]
    >;
    expect(indexes).toEqual(
      expect.arrayContaining([
        [{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })],
        [{ jti: 1 }, expect.objectContaining({ unique: true })],
        [{ tokenHash: 1 }, expect.objectContaining({ unique: true })],
      ]),
    );
  });

  it("rotates a valid refresh token and revokes the previous session atomically", async () => {
    const initial = await registerSession();
    const response = await refresh(initial.cookie);

    expect(response.status).toBe(200);
    expect(authResponseSchema.parse(response.body).data.user.email).toBe("athlete@example.com");
    const replacement = readRefreshCookie(response);
    expect(replacement.raw).not.toBe(initial.cookie.raw);

    const previous = await RefreshSessionModel.findOne({
      tokenHash: hashToken(initial.cookie.raw),
    }).lean();
    const current = await RefreshSessionModel.findOne({
      tokenHash: hashToken(replacement.raw),
    }).lean();
    expect(previous).toMatchObject({
      replacedByJti: current?.jti,
      revokedReason: "ROTATED",
    });
    expect(previous?.revokedAt).toBeInstanceOf(Date);
    expect(current?.activatedAt).toBeInstanceOf(Date);
    expect(current?.revokedAt).toBeNull();
  });

  it("detects replay, revokes the complete token family, and blocks its replacement", async () => {
    const initial = await registerSession();
    const rotated = await refresh(initial.cookie);
    const replacement = readRefreshCookie(rotated);

    const replay = await refresh(initial.cookie);
    expect(replay.status).toBe(401);
    expect(apiErrorResponseSchema.parse(replay.body).error.code).toBe("UNAUTHENTICATED");

    const replacementAttempt = await refresh(replacement);
    expect(replacementAttempt.status).toBe(401);

    const sessions = await RefreshSessionModel.find({}).lean();
    expect(sessions).toHaveLength(2);
    expect(sessions.every((session) => session.revokedAt instanceof Date)).toBe(true);
    expect(sessions.some((session) => session.revokedReason === "REUSE_DETECTED")).toBe(true);
  });

  it("rejects missing or untrusted origins without consuming the refresh token", async () => {
    const initial = await registerSession();

    const missing = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", initial.cookie.header);
    const untrusted = await refresh(initial.cookie, "https://attacker.example");

    for (const response of [missing, untrusted]) {
      expect(response.status).toBe(403);
      expect(apiErrorResponseSchema.parse(response.body)).toEqual({
        error: {
          code: "FORBIDDEN",
          message: "Request origin not allowed",
        },
      });
    }

    const stillValid = await refresh(initial.cookie);
    expect(stillValid.status).toBe(200);
  });

  it("rejects an expired persisted session even when the signed token has time left", async () => {
    const initial = await registerSession();
    await RefreshSessionModel.updateOne(
      { tokenHash: hashToken(initial.cookie.raw) },
      { $set: { expiresAt: new Date(Date.now() - 1_000) } },
    );

    const response = await refresh(initial.cookie);

    expect(response.status).toBe(401);
    expect(apiErrorResponseSchema.parse(response.body).error.code).toBe("UNAUTHENTICATED");
  });

  it("revokes the current session, clears the cookie, and prevents later refresh", async () => {
    const initial = await registerSession();
    const logout = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", initial.cookie.header)
      .set("Origin", WEB_ORIGIN);

    expect(logout.status).toBe(204);
    const cleared = readRefreshCookie(logout);
    expect(cleared.raw).toBe("");
    expect(cleared.setCookie.expires?.getTime()).toBeLessThanOrEqual(Date.now());

    const stored = await RefreshSessionModel.findOne({
      tokenHash: hashToken(initial.cookie.raw),
    }).lean();
    expect(stored?.revokedAt).toBeInstanceOf(Date);
    expect(stored?.revokedReason).toBe("LOGOUT");

    const replay = await refresh(initial.cookie);
    expect(replay.status).toBe(401);
  });
});
