import { z } from "zod";

import { publicUserSchema } from "./user.js";

const normalizedEmailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
const passwordSchema = z.string().min(8).max(128);

export const registerRequestSchema = z.strictObject({
  email: normalizedEmailSchema,
  password: passwordSchema,
});

export const loginRequestSchema = registerRequestSchema;

export const authResponseSchema = z.strictObject({
  data: z.strictObject({
    accessToken: z.jwt(),
    user: publicUserSchema,
  }),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
