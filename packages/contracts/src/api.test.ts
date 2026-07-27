import { describe, expect, it } from "vitest";

import {
  apiErrorResponseSchema,
  createPaginatedResponseSchema,
  ERROR_HTTP_STATUS,
  healthResponseSchema,
  paginationQuerySchema,
} from "./index.js";

describe("shared API contracts", () => {
  it("accepts the stable health response shape", () => {
    const response = healthResponseSchema.parse({
      data: {
        status: "ok",
        timestamp: "2026-07-27T08:00:00.000Z",
        services: {
          api: "up",
          database: "connected",
        },
      },
    });

    expect(response.data.services.database).toBe("connected");
  });

  it("rejects an error code outside the public error contract", () => {
    const result = apiErrorResponseSchema.safeParse({
      error: {
        code: "INTERNAL_STACK_TRACE",
        message: "Invalid request",
      },
    });

    expect(result.success).toBe(false);
  });

  it("maps every public error code to a stable HTTP status", () => {
    expect(ERROR_HTTP_STATUS).toEqual({
      VALIDATION_ERROR: 422,
      UNAUTHENTICATED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      RATE_LIMITED: 429,
      INTERNAL_ERROR: 500,
      SERVICE_UNAVAILABLE: 503,
    });
  });

  it("coerces and constrains pagination query values", () => {
    expect(paginationQuerySchema.parse({ page: "2", pageSize: "25" })).toEqual({
      page: 2,
      pageSize: 25,
    });
    expect(paginationQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ pageSize: "101" }).success).toBe(false);
  });

  it("validates paginated data and derived totals", () => {
    const schema = createPaginatedResponseSchema(healthResponseSchema.shape.data);
    const result = schema.safeParse({
      data: [
        {
          status: "ok",
          timestamp: "2026-07-27T08:00:00.000Z",
          services: { api: "up", database: "connected" },
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    });

    expect(result.success).toBe(true);

    expect(
      schema.safeParse({
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 21,
          totalPages: 1,
        },
      }).success,
    ).toBe(false);
  });
});
