import { z } from "zod";

export const healthResponseSchema = z
  .object({
    data: z
      .object({
        status: z.enum(["ok", "unavailable"]),
        timestamp: z.iso.datetime(),
        services: z
          .object({
            api: z.literal("up"),
            database: z.enum(["connected", "disconnected"]),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export type HealthResponse = z.infer<typeof healthResponseSchema>;
