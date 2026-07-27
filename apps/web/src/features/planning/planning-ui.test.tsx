import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Exercise } from "@gym-tracking/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../../i18n/index.js";
import type { Locale } from "../../i18n/resources.js";
import * as api from "../../services/planning-api.js";
import { ExerciseCatalogPage } from "./ExerciseCatalogPage.js";
import { TrainingPlannerPage } from "./TrainingPlannerPage.js";
import { WorkoutTemplatesPage } from "./WorkoutTemplatesPage.js";

vi.mock("../../services/planning-api.js");

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
  it("searches, filters and creates an exercise", async () => {
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
    await user.click(screen.getByRole("button", { name: "Create exercise" }));
    expect(api.createExercise).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Core hold" }),
      expect.anything(),
    );
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

  it("creates a template and sends exercise order from the editor", async () => {
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

    await user.type(screen.getByLabelText("Template name"), "Push day");
    await user.selectOptions(screen.getByLabelText("Add exercise"), exercise.id);
    await user.click(screen.getByRole("button", { name: "Create template" }));
    expect(api.createTemplate).toHaveBeenCalledWith(
      {
        name: "Push day",
        exerciseIds: [exercise.id],
      },
      expect.anything(),
    );
  });

  it("creates, activates and reschedules a plan before accepting a suggestion", async () => {
    const template = {
      id: "507f1f77bcf86cd799439013",
      ownerId: "507f1f77bcf86cd799439014",
      name: "Push day",
      exercises: [{ exerciseId: exercise.id, order: 0, exercise }],
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt,
    };
    const plan = {
      id: "507f1f77bcf86cd799439015",
      ownerId: "507f1f77bcf86cd799439014",
      name: "General",
      goal: "GENERAL" as const,
      experienceLevel: "BEGINNER" as const,
      daysPerWeek: 1,
      durationMinutes: 45,
      availableEquipment: ["BODYWEIGHT" as const],
      schedule: [{ dayOfWeek: "MONDAY" as const, templateId: template.id }],
      isActive: false,
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt,
    };
    vi.mocked(api.listTemplates).mockResolvedValue({ data: [template] });
    vi.mocked(api.listPlans).mockResolvedValue({ data: [plan] });
    vi.mocked(api.createPlan).mockResolvedValue({ data: { ...plan, isActive: true } });
    vi.mocked(api.updatePlan).mockResolvedValue({ data: { ...plan, isActive: true } });
    vi.mocked(api.createScheduleOverride).mockResolvedValue(undefined);
    vi.mocked(api.listScheduledWorkouts).mockResolvedValue({
      data: [
        {
          planId: "507f1f77bcf86cd799439015",
          planName: "General",
          templateId: "507f1f77bcf86cd799439013",
          templateName: "Push day",
          scheduledDate: "2026-07-27",
          status: "SCHEDULED",
        },
      ],
    });
    vi.mocked(api.listSuggestions).mockResolvedValue({
      data: [
        {
          exerciseId: "507f1f77bcf86cd799439016",
          exerciseName: "Plank",
          reasonCode: "MISSING_MOVEMENT_PATTERN",
          reasonParams: { movementPattern: "ISOLATION" },
          suggestedTemplateId: "507f1f77bcf86cd799439013",
          suggestedDay: "MONDAY",
        },
      ],
    });
    vi.mocked(api.acceptSuggestion).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage(<TrainingPlannerPage />);

    expect(await screen.findByText(/2026-07-27/)).toBeVisible();
    await user.type(screen.getByLabelText("Plan name"), "General");
    await user.selectOptions(screen.getByLabelText("Monday template"), template.id);
    await user.click(screen.getByRole("button", { name: "Create plan" }));
    expect(api.createPlan).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Make active" }));
    expect(api.updatePlan).toHaveBeenCalledWith(plan.id, { isActive: true });
    await user.click(screen.getByRole("button", { name: "Move one day" }));
    expect(api.createScheduleOverride).toHaveBeenCalledWith(
      expect.objectContaining({ action: "RESCHEDULE" }),
      expect.anything(),
    );
    await user.click(screen.getByRole("button", { name: "View suggestions" }));
    expect(await screen.findByText("Plank")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Accept Plank" }));
    expect(api.acceptSuggestion).toHaveBeenCalled();
  });
});
