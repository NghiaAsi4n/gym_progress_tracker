import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, ThemeSwitcher } from "./theme.js";
import { useReducedMotion } from "./media-preferences.js";
import { useTheme } from "./theme-context.js";
import { THEME_STORAGE_KEY } from "./theme-storage.js";

interface MediaQueryController {
  setMatches: (matches: boolean) => void;
}

function mockMediaQuery(
  initialMatches: Record<string, boolean>,
): Map<string, MediaQueryController> {
  const controllers = new Map<string, MediaQueryController>();

  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => {
      let matches = initialMatches[query] ?? false;
      const listeners = new Set<(event: MediaQueryListEvent) => void>();
      const mediaQuery = {
        get matches() {
          return matches;
        },
        media: query,
        onchange: null,
        addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
          if (typeof listener === "function") {
            listeners.add(listener);
          }
        },
        removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
          if (typeof listener === "function") {
            listeners.delete(listener);
          }
        },
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList;

      controllers.set(query, {
        setMatches(nextMatches) {
          matches = nextMatches;
          const event = { matches, media: query } as MediaQueryListEvent;
          listeners.forEach((listener) => {
            listener(event);
          });
        },
      });

      return mediaQuery;
    }),
  );

  return controllers;
}

function ThemeProbe() {
  const { preference, resolvedTheme } = useTheme();

  return <output>{`${preference}:${resolvedTheme}`}</output>;
}

function MotionProbe() {
  const reducedMotion = useReducedMotion();

  return <output>{reducedMotion ? "reduced" : "full"}</output>;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-preference");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("theme preferences", () => {
  it("switches theme and persists the explicit preference", async () => {
    mockMediaQuery({ "(prefers-color-scheme: dark)": false });
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeSwitcher
          labels={{ light: "Sáng", dark: "Tối", system: "Hệ thống" }}
          groupLabel="Giao diện"
        />
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByText("system:light")).toBeVisible();
    await user.click(screen.getByRole("radio", { name: "Tối" }));

    expect(screen.getByText("dark:dark")).toBeVisible();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("tracks operating-system changes while the system preference is active", () => {
    const media = mockMediaQuery({ "(prefers-color-scheme: dark)": false });

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByText("system:light")).toBeVisible();
    act(() => {
      media.get("(prefers-color-scheme: dark)")?.setMatches(true);
    });

    expect(screen.getByText("system:dark")).toBeVisible();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("reports reduced-motion preference changes", () => {
    const media = mockMediaQuery({ "(prefers-reduced-motion: reduce)": false });

    render(<MotionProbe />);

    expect(screen.getByText("full")).toBeVisible();
    act(() => {
      media.get("(prefers-reduced-motion: reduce)")?.setMatches(true);
    });
    expect(screen.getByText("reduced")).toBeVisible();
  });
});
