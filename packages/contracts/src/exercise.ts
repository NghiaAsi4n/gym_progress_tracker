import { z } from "zod";

import { createPaginatedResponseSchema } from "./api.js";

export const muscleGroupSchema = z.enum([
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "LEGS",
  "GLUTES",
  "CORE",
  "CALVES",
  "FOREARMS",
  "FULL_BODY",
]);
export type MuscleGroup = z.infer<typeof muscleGroupSchema>;

export const movementPatternSchema = z.enum([
  "PUSH",
  "PULL",
  "HINGE",
  "SQUAT",
  "CARRY",
  "ROTATION",
  "ISOLATION",
]);
export type MovementPattern = z.infer<typeof movementPatternSchema>;

export const equipmentSchema = z.enum([
  "BARBELL",
  "DUMBBELL",
  "CABLE",
  "MACHINE",
  "BODYWEIGHT",
  "KETTLEBELL",
  "RESISTANCE_BAND",
  "SMITH_MACHINE",
  "OTHER",
]);
export type Equipment = z.infer<typeof equipmentSchema>;

export const difficultySchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
export type Difficulty = z.infer<typeof difficultySchema>;

export const exerciseSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(100),
    muscleGroups: z.array(muscleGroupSchema).min(1),
    movementPattern: movementPatternSchema,
    equipment: equipmentSchema,
    difficulty: difficultySchema,
    isSystem: z.boolean(),
    ownerId: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export type Exercise = z.infer<typeof exerciseSchema>;

export const createExerciseRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    muscleGroups: z.array(muscleGroupSchema).min(1).max(5),
    movementPattern: movementPatternSchema,
    equipment: equipmentSchema,
    difficulty: difficultySchema,
  })
  .strict();
export type CreateExerciseRequest = z.infer<typeof createExerciseRequestSchema>;

export const updateExerciseRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    muscleGroups: z.array(muscleGroupSchema).min(1).max(5).optional(),
    movementPattern: movementPatternSchema.optional(),
    equipment: equipmentSchema.optional(),
    difficulty: difficultySchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateExerciseRequest = z.infer<typeof updateExerciseRequestSchema>;

export const exerciseQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    name: z.string().trim().min(1).max(100).optional(),
    muscleGroup: muscleGroupSchema.optional(),
  })
  .strict();
export type ExerciseQuery = z.infer<typeof exerciseQuerySchema>;

export const exerciseResponseSchema = z.object({ data: exerciseSchema }).strict();
export const exerciseListResponseSchema = createPaginatedResponseSchema(exerciseSchema);
export type ExerciseResponse = z.infer<typeof exerciseResponseSchema>;
export type ExerciseListResponse = z.infer<typeof exerciseListResponseSchema>;
