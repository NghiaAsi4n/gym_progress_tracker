import { z } from "zod";

import { objectIdSchema } from "./workout-template.js";

export const bodyWeightSchema = z
  .object({
    id: objectIdSchema,
    ownerId: objectIdSchema,
    measuredOn: z.iso.date(),
    weightKg: z.number().min(20).max(500),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const createBodyWeightRequestSchema = z
  .object({
    measuredOn: z.iso.date(),
    weightKg: z.number().min(20).max(500),
  })
  .strict();

export const updateBodyWeightRequestSchema = z
  .object({
    measuredOn: z.iso.date().optional(),
    weightKg: z.number().min(20).max(500).optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field must be provided",
  });

export const bodyWeightListQuerySchema = z
  .object({ from: z.iso.date(), to: z.iso.date() })
  .strict()
  .refine(({ from, to }) => from <= to, { message: "from must not be after to" });

export const bodyWeightResponseSchema = z.object({ data: bodyWeightSchema }).strict();
export const bodyWeightListResponseSchema = z
  .object({ data: z.array(bodyWeightSchema) })
  .strict();

export type BodyWeight = z.infer<typeof bodyWeightSchema>;
export type CreateBodyWeightRequest = z.infer<typeof createBodyWeightRequestSchema>;
export type UpdateBodyWeightRequest = z.infer<typeof updateBodyWeightRequestSchema>;
export type BodyWeightListQuery = z.infer<typeof bodyWeightListQuerySchema>;
