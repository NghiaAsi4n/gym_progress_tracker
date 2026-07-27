import { z } from "zod";

import { objectIdSchema } from "./workout-template.js";

export const suggestionReasonCodeSchema = z.enum(["MISSING_MOVEMENT_PATTERN", "GOAL_MATCH"]);
export const exerciseSuggestionSchema = z
  .object({
    exerciseId: objectIdSchema,
    exerciseName: z.string().min(1),
    reasonCode: suggestionReasonCodeSchema,
    reasonParams: z.record(z.string(), z.union([z.string(), z.number()])),
    suggestedTemplateId: objectIdSchema.nullable(),
    suggestedDay: z.string().nullable(),
  })
  .strict();
export const exerciseSuggestionListResponseSchema = z
  .object({ data: z.array(exerciseSuggestionSchema) })
  .strict();
export const acceptSuggestionRequestSchema = z.object({ templateId: objectIdSchema }).strict();

export type ExerciseSuggestion = z.infer<typeof exerciseSuggestionSchema>;
export type SuggestionReasonCode = z.infer<typeof suggestionReasonCodeSchema>;
