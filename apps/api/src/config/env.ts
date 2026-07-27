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
