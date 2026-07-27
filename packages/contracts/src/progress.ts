import { z } from "zod";

import { objectIdSchema } from "./workout-template.js";

export const progressRangeQuerySchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
  })
  .strict()
  .refine(({ from, to }) => from <= to, { message: "from must not be after to" })
  .refine(
    ({ from, to }) =>
      (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) /
        86_400_000 <=
      366,
    { message: "Date range cannot exceed 366 days" },
  );

export const exerciseProgressPointSchema = z
  .object({
    date: z.iso.date(),
    volumeKg: z.number().min(0),
    bestWeightKg: z.number().min(0),
    estimated1RmKg: z.number().min(0),
    completedSets: z.number().int().min(0),
  })
  .strict();

export const exerciseProgressSchema = z
  .object({
    exerciseId: objectIdSchema,
    exerciseName: z.string().min(1),
    bestWeightKg: z.number().min(0),
    totalVolumeKg: z.number().min(0),
    bestEstimated1RmKg: z.number().min(0),
    weeklySets: z.number().min(0),
    prDates: z.array(z.iso.date()),
    timeSeries: z.array(exerciseProgressPointSchema),
  })
  .strict();

export const exerciseProgressResponseSchema = z
  .object({ data: z.array(exerciseProgressSchema) })
  .strict();

export type ProgressRangeQuery = z.infer<typeof progressRangeQuerySchema>;
export type ExerciseProgress = z.infer<typeof exerciseProgressSchema>;
