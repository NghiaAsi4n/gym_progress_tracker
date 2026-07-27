import { z } from "zod";

export const calorieEstimateSchema = z
  .object({
    estimatedCalories: z.number().int().min(0),
    bodyWeightKg: z.number().min(20).max(500),
    bodyWeightMeasuredOn: z.iso.date(),
    met: z.number().positive(),
    durationMinutes: z.number().min(0),
    method: z.literal("MET_V1"),
    sourceVersion: z.literal(1),
    calculatedAt: z.string().datetime(),
  })
  .strict();

export const calorieEstimateResponseSchema = z
  .object({ data: calorieEstimateSchema })
  .strict();

export type CalorieEstimate = z.infer<typeof calorieEstimateSchema>;
