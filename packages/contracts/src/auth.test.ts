import { describe, expect, it } from "vitest";

import {
  authResponseSchema,
  loginRequestSchema,
  meResponseSchema,
  preferencesPatchRequestSchema,
  registerRequestSchema,
  userPreferencesSchema,
} from "./index.js";

const accessToken =
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2NmYxYmYxYmYxYmYxYmYxYmYxYmYxYmYiLCJ0eXBlIjoiYWNjZXNzIn0.c2lnbmF0dXJl";

const publicUser = {
  id: "66f1bf1bf1bf1bf1bf1bf1bf",
  email: "athlete@example.com",
  preferences: {
    locale: "vi",
    theme: "SYSTEM",
    unit: "KG",
  },
};

describe("auth and account preference contracts", () => {
  it("normalizes email while preserving the password exactly", () => {
    expect(
      registerRequestSchema.parse({
        email: "  Athlete@Example.COM ",
        password: "  strong passphrase  ",
      }),
    ).toEqual({
      email: "athlete@example.com",
      password: "  strong passphrase  ",
    });

    expect(
      loginRequestSchema.parse({
        email: "Athlete@Example.COM",
        password: "correct horse battery staple",
      }),
    ).toEqual({
      email: "athlete@example.com",
      password: "correct horse battery staple",
    });
  });

  it("rejects weak, oversized, and unexpected credential input", () => {
    expect(
      registerRequestSchema.safeParse({
        email: "athlete@example.com",
        password: "short",
      }).success,
    ).toBe(false);
    expect(
      registerRequestSchema.safeParse({
        email: "athlete@example.com",
        password: "a".repeat(129),
      }).success,
    ).toBe(false);
    expect(
      loginRequestSchema.safeParse({
        email: "athlete@example.com",
        password: "correct horse battery staple",
        userId: "another-user",
      }).success,
    ).toBe(false);
  });

  it("accepts the public auth response without exposing password fields", () => {
    expect(
      authResponseSchema.parse({
        data: {
          accessToken,
          user: publicUser,
        },
      }),
    ).toEqual({
      data: {
        accessToken,
        user: publicUser,
      },
    });

    expect(
      meResponseSchema.safeParse({
        data: {
          user: {
            ...publicUser,
            passwordHash: "must-never-leave-the-api",
          },
        },
      }).success,
    ).toBe(false);
  });

  it("only accepts supported account preference enums", () => {
    expect(
      userPreferencesSchema.parse({
        locale: "en",
        theme: "DARK",
        unit: "LB",
      }),
    ).toEqual({
      locale: "en",
      theme: "DARK",
      unit: "LB",
    });

    expect(
      preferencesPatchRequestSchema.safeParse({
        theme: "SEPIA",
      }).success,
    ).toBe(false);
    expect(preferencesPatchRequestSchema.safeParse({}).success).toBe(false);
  });
});
