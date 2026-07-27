import { z } from "zod";

import { ApiError } from "./api-error.js";

export function validateInput<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): z.output<Schema> {
  const result = schema.safeParse(input);

  if (!result.success) {
    const flattened = z.flattenError(result.error);
    throw new ApiError("VALIDATION_ERROR", "Invalid request", {
      fields: flattened.fieldErrors,
      form: flattened.formErrors,
    });
  }

  return result.data;
}
