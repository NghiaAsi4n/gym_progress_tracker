import { QueryClient } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LOCALE_STORAGE_KEY } from "../i18n/locale-storage.js";
import { AppErrorBoundary } from "./error-boundary.js";
import { AppProviders } from "./providers.js";
import { appRoutes } from "./router.js";

function renderRoute(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [path],
  });

  return render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, "vi");
  document.documentElement.lang = "vi";
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("application shell", () => {
  it("registers a new account from the registration page", async () => {
    const user = userEvent.setup();
    const email = "new-athlete@example.com";
    const authPayload = {
      data: {
        accessToken:
          "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZiJ9.signature",
        user: {
          id: "1234567890abcdef12345678",
          email,
          preferences: { locale: "vi", theme: "SYSTEM", unit: "KG" },
        },
      },
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

      if (url.endsWith("/auth/refresh")) {
        return Promise.resolve(new Response(undefined, { status: 401 }));
      }
      if (url.endsWith("/auth/register")) {
        return Promise.resolve(
          new Response(JSON.stringify(authPayload), {
            headers: { "Content-Type": "application/json" },
            status: 201,
          }),
        );
      }
      if (url.endsWith("/health")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                status: "ok",
                timestamp: "2026-07-27T08:00:00.000Z",
                services: { api: "up", database: "connected" },
              },
            }),
            { headers: { "Content-Type": "application/json" }, status: 200 },
          ),
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderRoute("/auth/register");
    await user.type(screen.getByLabelText("Email"), email);
    await user.type(screen.getByLabelText("Mật khẩu"), "SignupPassword1!");
    await user.click(screen.getByRole("button", { name: "Đăng ký" }));

    const accountControls = await screen.findByRole("group", { name: "Tài khoản" });
    expect(within(accountControls).getByText("Đang đăng nhập với")).toBeVisible();
    expect(within(accountControls).getByText(email)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/auth/register",
      expect.objectContaining({
        body: JSON.stringify({ email, password: "SignupPassword1!" }),
        credentials: "include",
        method: "POST",
      }),
    );
  });

  it("renders the home route and reports API health", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            status: "ok",
            timestamp: "2026-07-27T08:00:00.000Z",
            services: {
              api: "up",
              database: "connected",
            },
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      ),
    );

    renderRoute("/");

    expect(screen.getByRole("heading", { level: 1, name: "Gym Progress Tracker" })).toBeVisible();
    expect(await screen.findByText("API và MongoDB đã sẵn sàng.")).toBeVisible();
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/health",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("keeps sign out separate from primary navigation", async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    document.documentElement.lang = "en";
    const authenticatedUser = {
      id: "1234567890abcdef12345678",
      email: "athlete@example.com",
      preferences: { locale: "en", theme: "SYSTEM", unit: "KG" },
    };
    const authPayload = {
      data: {
        accessToken:
          "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZiJ9.signature",
        user: authenticatedUser,
      },
    };
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

      if (url.endsWith("/auth/refresh")) {
        return Promise.resolve(
          new Response(JSON.stringify(authPayload), {
            headers: { "Content-Type": "application/json" },
            status: 200,
          }),
        );
      }
      if (url.endsWith("/me")) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { user: authenticatedUser } }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
          }),
        );
      }
      if (url.endsWith("/health")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                status: "ok",
                timestamp: "2026-07-27T08:00:00.000Z",
                services: { api: "up", database: "connected" },
              },
            }),
            { headers: { "Content-Type": "application/json" }, status: 200 },
          ),
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderRoute("/");

    const header = screen.getByRole("banner");
    const navigation = within(header).getByRole("navigation", { name: "Primary navigation" });
    const accountControls = await within(header).findByRole("group", {
      name: "Account controls",
    });

    expect(within(navigation).queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Plan" })).toHaveAttribute(
      "href",
      "/templates",
    );
    expect(within(navigation).queryByRole("link", { name: "Templates" })).not.toBeInTheDocument();
    expect(within(accountControls).getByText(authenticatedUser.email)).toBeVisible();
    expect(within(accountControls).getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  it("renders a useful 404 route", () => {
    renderRoute("/khong-ton-tai");

    expect(screen.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Về trang chủ" })).toHaveAttribute("href", "/");
  });

  it("switches the complete shell between Vietnamese and English", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            status: "ok",
            timestamp: "2026-07-27T08:00:00.000Z",
            services: {
              api: "up",
              database: "connected",
            },
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      ),
    );

    renderRoute("/");
    await user.selectOptions(screen.getByRole("combobox", { name: "Ngôn ngữ" }), "en");

    expect(
      within(screen.getByRole("navigation", { name: "Primary navigation" })).getByRole("link", {
        name: "Overview",
      }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Service connection" })).toBeVisible();
    expect(
      screen.getByText(
        "The foundation is ready for workout planning, set logging, and progress tracking.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Plan with intent. Train with evidence.")).toBeVisible();
  });

  it("lets the user recover from a render error", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    function UnstableContent() {
      if (shouldThrow) {
        throw new Error("Test render error");
      }
      return <p>Nội dung đã phục hồi.</p>;
    }

    render(
      <AppErrorBoundary
        onReset={() => {
          shouldThrow = false;
        }}
      >
        <UnstableContent />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Đã có lỗi xảy ra");
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(screen.getByText("Nội dung đã phục hồi.")).toBeVisible();
  });

  it("localizes the render-error fallback from the document locale", () => {
    document.documentElement.lang = "en";
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    function BrokenContent(): never {
      throw new Error("Test render error");
    }

    render(
      <AppErrorBoundary>
        <BrokenContent />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});
