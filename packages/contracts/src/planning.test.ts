import { describe, expect, it } from "vitest";

import {
  createTrainingPlanRequestSchema,
  createWorkoutTemplateRequestSchema,
  scheduleOverrideRequestSchema,
} from "./index.js";

const objectId = "507f1f77bcf86cd799439011";

describe("planning contracts", () => {
  it("accepts an ordered workout template input", () => {
    expect(
      createWorkoutTemplateRequestSchema.parse({
        name: "Push day",
        exerciseIds: [objectId],
      }),
    ).toEqual({ name: "Push day", exerciseIds: [objectId] });
  });

  it("rejects a plan when daysPerWeek disagrees with its schedule", () => {
    expect(() =>
      createTrainingPlanRequestSchema.parse({
        name: "Strength",
        goal: "STRENGTH",
        experienceLevel: "INTERMEDIATE",
        daysPerWeek: 2,
        durationMinutes: 60,
        availableEquipment: ["BARBELL"],
        schedule: [{ dayOfWeek: "MONDAY", templateId: objectId }],
      }),
    ).toThrow();
  });

  it("requires a rescheduled date only for RESCHEDULE overrides", () => {
    expect(() =>
      scheduleOverrideRequestSchema.parse({
        planId: objectId,
        scheduledDate: "2026-07-27",
        action: "RESCHEDULE",
      }),
    ).toThrow();
    expect(
      scheduleOverrideRequestSchema.parse({
        planId: objectId,
        scheduledDate: "2026-07-27",
        action: "SKIP",
      }),
    ).toMatchObject({ action: "SKIP" });
  });
});
