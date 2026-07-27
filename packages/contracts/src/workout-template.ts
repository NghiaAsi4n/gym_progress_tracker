import { z } from "zod";

import { exerciseSchema } from "./exercise.js";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid resource id");

export const templateExerciseSchema = z
  .object({
    exerciseId: objectIdSchema,
    order: z.number().int().min(0),
    exercise: exerciseSchema,
  })
  .strict();

export const workoutTemplateSchema = z
  .object({
    id: objectIdSchema,
    name: z.string().min(1).max(100),
    exercises: z.array(templateExerciseSchema).max(30),
    ownerId: objectIdSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const createWorkoutTemplateRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    exerciseIds: z.array(objectIdSchema).max(30),
  })
  .strict()
  .refine(({ exerciseIds }) => new Set(exerciseIds).size === exerciseIds.length, {
    message: "Exercise references must be unique",
    path: ["exerciseIds"],
  });

export const updateWorkoutTemplateRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    exerciseIds: z.array(objectIdSchema).max(30).optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field must be provided",
  })
  .refine(({ exerciseIds }) => !exerciseIds || new Set(exerciseIds).size === exerciseIds.length, {
    message: "Exercise references must be unique",
    path: ["exerciseIds"],
  });

export const workoutTemplateResponseSchema = z.object({ data: workoutTemplateSchema }).strict();
export const workoutTemplateListResponseSchema = z
  .object({ data: z.array(workoutTemplateSchema) })
  .strict();

export type WorkoutTemplate = z.infer<typeof workoutTemplateSchema>;
export type CreateWorkoutTemplateRequest = z.infer<typeof createWorkoutTemplateRequestSchema>;
export type UpdateWorkoutTemplateRequest = z.infer<typeof updateWorkoutTemplateRequestSchema>;
export type WorkoutTemplateResponse = z.infer<typeof workoutTemplateResponseSchema>;
export type WorkoutTemplateListResponse = z.infer<typeof workoutTemplateListResponseSchema>;
