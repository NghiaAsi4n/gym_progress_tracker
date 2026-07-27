import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../../i18n/index.js";
import * as workoutApi from "../../services/workout-api.js";
import { WorkoutHistoryPage } from "./WorkoutHistoryPage.js";

vi.mock("../../services/workout-api.js");

const originalClose = HTMLDialogElement.prototype.close;
const originalShowModal = HTMLDialogElement.prototype.showModal;

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

afterEach(() => {
  HTMLDialogElement.prototype.close = originalClose;
  HTMLDialogElement.prototype.showModal = originalShowModal;
});

describe("workout history", () => {
  it("asks for confirmation before deleting a cancelled workout", async () => {
    vi.mocked(workoutApi.listWorkoutHistory).mockResolvedValue({
      data: [
        {
          calorieEstimate: null,
          cancelledAt: "2026-07-27T00:05:00.000Z",
          completedAt: null,
          createdAt: "2026-07-27T00:00:00.000Z",
          durationSeconds: 300,
          exercises: [],
          id: "507f1f77bcf86cd799439011",
          notes: "",
          ownerId: "507f1f77bcf86cd799439012",
          source: { type: "EMPTY" as const },
          startedAt: "2026-07-27T00:00:00.000Z",
          status: "CANCELLED" as const,
          updatedAt: "2026-07-27T00:05:00.000Z",
          version: 2,
          volumeKg: 0,
        },
      ],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });
    vi.mocked(workoutApi.deleteWorkout).mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <I18nProvider initialLocale="en">
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <MemoryRouter>
            <WorkoutHistoryPage />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>,
    );

    const row = await screen.findByRole("listitem");
    await user.click(within(row).getByRole("button", { name: "Delete workout" }));

    const dialog = screen.getByRole("dialog", { name: "Delete this workout?" });
    expect(workoutApi.deleteWorkout).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Delete workout" }));

    expect(workoutApi.deleteWorkout).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      expect.anything(),
    );
  });
});
