import { z } from "zod";

import { createPaginatedResponseSchema, paginationQuerySchema } from "./api.js";
import { objectIdSchema } from "./workout-template.js";

export const workoutStatusSchema = z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]);

export const workoutSetSchema = z
  .object({
    id: objectIdSchema,
    order: z.number().int().min(0),
    weightKg: z.number().min(0).max(1_000).nullable(),
    reps: z.number().int().min(0).max(1_000).nullable(),
    isComplete: z.boolean(),
    notes: z.string().max(500),
  })
  .strict();

export const workoutExerciseSchema = z
  .object({
    id: objectIdSchema,
    exerciseId: objectIdSchema,
    name: z.string().min(1).max(120),
    order: z.number().int().min(0),
    sets: z.array(workoutSetSchema).max(30),
  })
  .strict();

const emptySourceSchema = z.object({ type: z.literal("EMPTY") }).strict();
const templateSourceSchema = z
  .object({
    type: z.literal("TEMPLATE"),
    templateId: objectIdSchema,
    templateName: z.string().min(1).max(100),
  })
  .strict();
const scheduledSourceSchema = z
  .object({
    type: z.literal("SCHEDULED"),
    planId: objectIdSchema,
    planName: z.string().min(1).max(100),
    templateId: objectIdSchema,
    templateName: z.string().min(1).max(100),
    scheduledDate: z.iso.date(),
  })
  .strict();

export const workoutSourceSchema = z.discriminatedUnion("type", [
  emptySourceSchema,
  templateSourceSchema,
  scheduledSourceSchema,
]);

export const createWorkoutDraftRequestSchema = z
  .object({
    source: z.discriminatedUnion("type", [
      emptySourceSchema,
      z.object({ type: z.literal("TEMPLATE"), templateId: objectIdSchema }).strict(),
      z
        .object({
          type: z.literal("SCHEDULED"),
          planId: objectIdSchema,
          templateId: objectIdSchema,
          scheduledDate: z.iso.date(),
        })
        .strict(),
    ]),
  })
  .strict();

const editableExerciseSchema = workoutExerciseSchema.omit({ name: true });

export const updateWorkoutDraftRequestSchema = z
  .object({
    version: z.number().int().min(1),
    exercises: z.array(editableExerciseSchema).max(40).optional(),
    notes: z.string().max(2_000).optional(),
  })
  .strict()
  .refine(({ exercises, notes }) => exercises !== undefined || notes !== undefined, {
    message: "At least one editable field must be provided",
  });

export const workoutTransitionRequestSchema = z
  .object({ version: z.number().int().min(1) })
  .strict();

export const workoutSchema = z
  .object({
    id: objectIdSchema,
    ownerId: objectIdSchema,
    status: workoutStatusSchema,
    source: workoutSourceSchema,
    exercises: z.array(workoutExerciseSchema),
    notes: z.string(),
    version: z.number().int().min(1),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
    cancelledAt: z.string().datetime().nullable(),
    durationSeconds: z.number().int().min(0).nullable(),
    volumeKg: z.number().min(0).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const workoutResponseSchema = z.object({ data: workoutSchema }).strict();
export const workoutHistoryQuerySchema = paginationQuerySchema;
export const workoutHistoryResponseSchema = createPaginatedResponseSchema(workoutSchema);

export type Workout = z.infer<typeof workoutSchema>;
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;
export type WorkoutSet = z.infer<typeof workoutSetSchema>;
export type CreateWorkoutDraftRequest = z.infer<typeof createWorkoutDraftRequestSchema>;
export type UpdateWorkoutDraftRequest = z.infer<typeof updateWorkoutDraftRequestSchema>;
export type WorkoutTransitionRequest = z.infer<typeof workoutTransitionRequestSchema>;
export type WorkoutHistoryQuery = z.infer<typeof workoutHistoryQuerySchema>;
