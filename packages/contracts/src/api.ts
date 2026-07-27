import { z } from "zod";

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const paginationMetadataSchema = z
  .object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
    totalItems: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  })
  .strict()
  .superRefine(({ pageSize, totalItems, totalPages }, context) => {
    if (totalPages !== Math.ceil(totalItems / pageSize)) {
      context.addIssue({
        code: "custom",
        message: "totalPages must equal ceil(totalItems / pageSize)",
        path: ["totalPages"],
      });
    }
  });

export function createPaginatedResponseSchema<ItemSchema extends z.ZodType>(
  itemSchema: ItemSchema,
) {
  return z
    .object({
      data: z.array(itemSchema),
      pagination: paginationMetadataSchema,
    })
    .strict();
}

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PaginationMetadata = z.infer<typeof paginationMetadataSchema>;
