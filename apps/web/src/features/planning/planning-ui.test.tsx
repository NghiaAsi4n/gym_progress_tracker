import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Exercise } from "@gym-tracking/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../../i18n/index.js";
import type { Locale } from "../../i18n/resources.js";
import * as api from "../../services/planning-api.js";
import { ExerciseCatalogPage } from "./ExerciseCatalogPage.js";
import { WorkoutTemplatesPage } from "./WorkoutTemplatesPage.js";

vi.mock("../../services/planning-api.js");

beforeEach(() => {
  vi.clearAllMocks();
});

const exercise: Exercise = {
  id: "507f1f77bcf86cd799439011",
  name: "Push-Up",
  muscleGroups: ["CHEST"],
  movementPattern: "PUSH",
  equipment: "BODYWEIGHT",
  difficulty: "BEGINNER",
  isSystem: true,
  ownerId: null,
  createdAt: "2026-07-27T00:00:00.000Z",
  updatedAt: "2026-07-27T00:00:00.000Z",
};

function renderPage(page: React.ReactNode, locale: Locale = "en") {
  return render(
    <I18nProvider initialLocale={locale}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        {page}
      </QueryClientProvider>
    </I18nProvider>,
  );
}

describe("Phase 4 planning UI", () => {
  it("searches, filters and creates an exercise with multiple muscle groups", async () => {
    vi.mocked(api.listExercises).mockResolvedValue({
      data: [exercise],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });
    vi.mocked(api.createExercise).mockResolvedValue({
      data: { ...exercise, id: "507f1f77bcf86cd799439012", name: "Core hold", isSystem: false },
    });
    const user = userEvent.setup();
    renderPage(<ExerciseCatalogPage />);

    await screen.findByText("Push-Up");
    await user.type(screen.getByRole("searchbox", { name: "Search exercises" }), "push");
    await user.selectOptions(screen.getByLabelText("Muscle group"), "CHEST");
    expect(api.listExercises).toHaveBeenLastCalledWith(
      expect.objectContaining({ muscleGroup: "CHEST", name: "push" }),
    );

    await user.type(screen.getByLabelText("Exercise name"), "Core hold");
    await user.click(screen.getByRole("checkbox", { name: "Chest" }));
    await user.click(screen.getByRole("checkbox", { name: "Shoulders" }));
    expect(screen.getByText("2/5 selected")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Create exercise" }));
    expect(api.createExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Core hold",
        muscleGroups: ["CHEST", "SHOULDERS"],
      }),
      expect.anything(),
    );
  });

  it("requires at least one muscle group", async () => {
    vi.mocked(api.listExercises).mockResolvedValue({
      data: [exercise],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderPage(<ExerciseCatalogPage />);

    await user.type(screen.getByLabelText("Exercise name"), "Core hold");
    await user.click(screen.getByRole("button", { name: "Create exercise" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Select at least one muscle group.");
    expect(api.createExercise).not.toHaveBeenCalled();
  });

  it("limits a custom exercise to five muscle groups", async () => {
    vi.mocked(api.listExercises).mockResolvedValue({
      data: [exercise],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderPage(<ExerciseCatalogPage />);

    for (const label of ["Chest", "Back", "Legs", "Core", "Shoulders"]) {
      await user.click(screen.getByRole("checkbox", { name: label }));
    }

    expect(screen.getByText("5/5 selected")).toBeVisible();
    expect(screen.getByRole("checkbox", { name: "Biceps" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Chest" })).toBeEnabled();
  });

  it("renders the exercise workflow in Vietnamese", async () => {
    vi.mocked(api.listExercises).mockResolvedValue({
      data: [exercise],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });

    renderPage(<ExerciseCatalogPage />, "vi");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Xây dựng thư viện động tác" }),
    ).toBeVisible();
    expect(screen.getByRole("searchbox", { name: "Tìm bài tập" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Nhóm cơ tác động" })).toBeVisible();
    expect(screen.getByRole("checkbox", { name: "Ngực" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Tạo bài tập" })).toBeVisible();
  });

  it("lets the user enter a new name for a custom exercise", async () => {
    const customExercise = {
      ...exercise,
      id: "507f1f77bcf86cd799439012",
      isSystem: false,
      name: "Custom squat",
      ownerId: "507f1f77bcf86cd799439014",
    };
    vi.mocked(api.listExercises).mockResolvedValue({
      data: [customExercise],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });
    vi.mocked(api.updateExercise).mockResolvedValue({
      data: { ...customExercise, name: "Goblet squat" },
    });
    const user = userEvent.setup();
    renderPage(<ExerciseCatalogPage />);

    await user.click(await screen.findByRole("button", { name: "Rename Custom squat" }));
    const nameInput = screen.getByRole("textbox", { name: "New exercise name" });
    expect(nameInput).toHaveValue("Custom squat");
    await user.clear(nameInput);
    await user.type(nameInput, "Goblet squat");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(api.updateExercise).toHaveBeenCalledWith(customExercise.id, {
      name: "Goblet squat",
    });
  });

  it("creates a plan and sends exercise order from the editor", async () => {
    vi.mocked(api.listExercises).mockResolvedValue({
      data: [exercise],
      pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
    });
    vi.mocked(api.listTemplates).mockResolvedValue({ data: [] });
    vi.mocked(api.createTemplate).mockResolvedValue({
      data: {
        id: "507f1f77bcf86cd799439013",
        ownerId: "507f1f77bcf86cd799439014",
        name: "Push day",
        exercises: [{ exerciseId: exercise.id, order: 0, exercise }],
        createdAt: exercise.createdAt,
        updatedAt: exercise.updatedAt,
      },
    });
    const user = userEvent.setup();
    renderPage(<WorkoutTemplatesPage />);

    await user.type(screen.getByLabelText("Plan name"), "Push day");
    await user.selectOptions(screen.getByLabelText("Add exercise"), exercise.id);
    await user.click(screen.getByRole("button", { name: "Create plan" }));
    expect(api.createTemplate).toHaveBeenCalledWith(
      {
        name: "Push day",
        exerciseIds: [exercise.id],
      },
      expect.anything(),
    );
  });

});
