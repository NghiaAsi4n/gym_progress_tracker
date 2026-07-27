import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

import { z } from "zod";

const rootEnvFile = new URL("../../../../.env", import.meta.url);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  MONGODB_URI: z
    .string()
    .regex(/^mongodb(?:\+srv)?:\/\//, "must be a MongoDB connection URI")
    .default("mongodb://127.0.0.1:27017/gym_tracking"),
  WEB_ORIGIN: z
    .url()
    .regex(/^https?:\/\//, "must use the http or https protocol")
    .default("http://localhost:5173"),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(3_600)
    .default(15 * 60),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(5 * 60)
    .max(30 * 24 * 60 * 60)
    .default(7 * 24 * 60 * 60),
  TOKEN_AUDIENCE: z.string().min(1).default("gym-tracking-web"),
  TOKEN_ISSUER: z.string().min(1).default("gym-tracking-api"),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadRootEnvFile(): void {
  if (existsSync(rootEnvFile)) {
    loadEnvFile(rootEnvFile);
  }
}

export function parseEnv(source: Record<string, string | undefined> = process.env): AppEnv {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`Invalid environment configuration: ${fields.join(", ")}`);
  }

  return result.data;
}
