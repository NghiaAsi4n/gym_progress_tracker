import { z } from "zod";

import { equipmentSchema } from "./exercise.js";
import { objectIdSchema } from "./workout-template.js";

export const trainingGoalSchema = z.enum(["STRENGTH", "HYPERTROPHY", "FAT_LOSS", "GENERAL"]);
export const experienceLevelSchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
export const dayOfWeekSchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);
export const planScheduleItemSchema = z
  .object({ dayOfWeek: dayOfWeekSchema, templateId: objectIdSchema })
  .strict();

const planInputShape = {
  name: z.string().trim().min(1).max(100),
  goal: trainingGoalSchema,
  experienceLevel: experienceLevelSchema,
  daysPerWeek: z.number().int().min(1).max(7),
  durationMinutes: z.number().int().min(15).max(180),
  availableEquipment: z.array(equipmentSchema).min(1),
  schedule: z.array(planScheduleItemSchema).min(1).max(7),
};

function scheduleMatchesDays(input: {
  daysPerWeek?: number | undefined;
  schedule?: Array<{ dayOfWeek: string }> | undefined;
}): boolean {
  if (!input.daysPerWeek || !input.schedule) return true;
  return (
    input.daysPerWeek === input.schedule.length &&
    new Set(input.schedule.map(({ dayOfWeek }) => dayOfWeek)).size === input.schedule.length
  );
}

export const createTrainingPlanRequestSchema = z
  .object(planInputShape)
  .strict()
  .refine(scheduleMatchesDays, {
    message: "daysPerWeek must match unique scheduled days",
    path: ["schedule"],
  });

export const updateTrainingPlanRequestSchema = z
  .object({
    name: planInputShape.name.optional(),
    goal: planInputShape.goal.optional(),
    experienceLevel: planInputShape.experienceLevel.optional(),
    daysPerWeek: planInputShape.daysPerWeek.optional(),
    durationMinutes: planInputShape.durationMinutes.optional(),
    availableEquipment: planInputShape.availableEquipment.optional(),
    schedule: planInputShape.schedule.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field must be provided",
  })
  .refine(scheduleMatchesDays, {
    message: "daysPerWeek must match unique scheduled days",
    path: ["schedule"],
  });

export const trainingPlanSchema = z
  .object({
    id: objectIdSchema,
    ownerId: objectIdSchema,
    ...planInputShape,
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export const trainingPlanResponseSchema = z.object({ data: trainingPlanSchema }).strict();
export const trainingPlanListResponseSchema = z
  .object({ data: z.array(trainingPlanSchema) })
  .strict();

const overrideMutationSchema = z
  .object({
    action: z.enum(["SKIP", "RESCHEDULE"]),
    rescheduledDate: z.iso.date().optional(),
  })
  .strict();

function validateOverride(
  { action, rescheduledDate }: z.infer<typeof overrideMutationSchema>,
  context: z.RefinementCtx,
): void {
  if (action === "RESCHEDULE" && !rescheduledDate) {
    context.addIssue({
      code: "custom",
      message: "rescheduledDate is required for RESCHEDULE",
      path: ["rescheduledDate"],
    });
  }
  if (action === "SKIP" && rescheduledDate) {
    context.addIssue({
      code: "custom",
      message: "rescheduledDate is not allowed for SKIP",
      path: ["rescheduledDate"],
    });
  }
}

export const scheduleOverrideRequestSchema = overrideMutationSchema
  .extend({
    planId: objectIdSchema,
    scheduledDate: z.iso.date(),
  })
  .superRefine(validateOverride);
export const updateScheduleOverrideRequestSchema =
  overrideMutationSchema.superRefine(validateOverride);

export const scheduledWorkoutSchema = z
  .object({
    planId: objectIdSchema,
    planName: z.string(),
    templateId: objectIdSchema,
    templateName: z.string(),
    scheduledDate: z.iso.date(),
    status: z.enum(["SCHEDULED", "RESCHEDULED"]),
  })
  .strict();
export const scheduledWorkoutListResponseSchema = z
  .object({ data: z.array(scheduledWorkoutSchema) })
  .strict();

export type TrainingPlan = z.infer<typeof trainingPlanSchema>;
export type CreateTrainingPlanRequest = z.infer<typeof createTrainingPlanRequestSchema>;
export type UpdateTrainingPlanRequest = z.infer<typeof updateTrainingPlanRequestSchema>;
export type ScheduleOverrideRequest = z.infer<typeof scheduleOverrideRequestSchema>;
export type ScheduledWorkout = z.infer<typeof scheduledWorkoutSchema>;
