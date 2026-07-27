import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../../i18n/index.js";
import * as planningApi from "../../services/planning-api.js";
import * as workoutApi from "../../services/workout-api.js";
import { ActiveWorkoutPage } from "./ActiveWorkoutPage.js";

vi.mock("../../services/planning-api.js");
vi.mock("../../services/workout-api.js");

describe("active workout", () => {
  it("starts an empty workout from the Vietnamese interface", async () => {
    vi.mocked(workoutApi.getActiveWorkout).mockResolvedValue(null);
    vi.mocked(workoutApi.createWorkoutDraft).mockResolvedValue({
      data: {
        id: "507f1f77bcf86cd799439011",
        ownerId: "507f1f77bcf86cd799439012",
        source: { type: "EMPTY" },
        status: "ACTIVE",
        startedAt: "2026-07-27T00:00:00.000Z",
        completedAt: null,
        cancelledAt: null,
        durationSeconds: null,
        exercises: [],
        notes: "",
        version: 1,
        volumeKg: null,
        calorieEstimate: null,
        createdAt: "2026-07-27T00:00:00.000Z",
        updatedAt: "2026-07-27T00:00:00.000Z",
      },
    });
    vi.mocked(planningApi.listTemplates).mockResolvedValue({ data: [] });
    vi.mocked(planningApi.listScheduledWorkouts).mockResolvedValue({ data: [] });
    const user = userEvent.setup();

    render(
      <I18nProvider initialLocale="vi">
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <MemoryRouter>
            <ActiveWorkoutPage />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "Bắt đầu buổi tập trống" }));

    expect(workoutApi.createWorkoutDraft).toHaveBeenCalledWith(
      { source: { type: "EMPTY" } },
      expect.anything(),
    );
  });
});
