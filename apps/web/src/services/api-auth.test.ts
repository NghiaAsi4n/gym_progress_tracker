import { afterEach, describe, expect, it, vi } from "vitest";

import { authenticatedFetch, clearAccessToken, login } from "./api-auth.js";

const authPayload = {
  data: {
    accessToken:
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZiJ9.signature",
    user: {
      id: "1234567890abcdef12345678",
      email: "athlete@example.com",
      preferences: { locale: "vi", theme: "SYSTEM", unit: "KG" },
    },
  },
};

afterEach(() => {
  clearAccessToken();
  vi.restoreAllMocks();
});

describe("authenticated API client", () => {
  it("refreshes once and retries concurrent unauthorized requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const requestUrl = (input: RequestInfo | URL): string =>
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(authPayload), { status: 200 }))
      .mockImplementation(async (input) => {
        const url = requestUrl(input);
        if (url.endsWith("/auth/refresh")) {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return new Response(JSON.stringify(authPayload), { status: 200 });
        }
        if (url.endsWith("/first") || url.endsWith("/second")) {
          return new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED" } }), {
            status:
              fetchMock.mock.calls.filter(([call]) => {
                const callUrl = requestUrl(call);
                return callUrl.endsWith("/first") || callUrl.endsWith("/second");
              }).length <= 2
                ? 401
                : 200,
          });
        }
        return new Response(JSON.stringify({ data: {} }), { status: 200 });
      });

    await login({ email: "athlete@example.com", password: "correct horse battery staple" });
    const [first, second] = await Promise.all([
      authenticatedFetch("/first"),
      authenticatedFetch("/second"),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(
      fetchMock.mock.calls.filter(([call]) => requestUrl(call).endsWith("/auth/refresh")),
    ).toHaveLength(1);
  });

  it("never stores the access token in browser storage", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(authPayload), { status: 200 }),
    );
    await login({ email: "athlete@example.com", password: "correct horse battery staple" });
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
