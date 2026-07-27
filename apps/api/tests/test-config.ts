import type { AuthTokenConfig } from "../src/modules/auth/token.service.js";

export const TEST_AUTH_CONFIG = {
  accessTokenAudience: "gym-tracking-web",
  accessTokenIssuer: "gym-tracking-api",
  accessTokenSecret: "test-access-token-secret-at-least-32-bytes",
  accessTokenTtlSeconds: 15 * 60,
  passwordScryptCost: 1_024,
  refreshTokenSecret: "test-refresh-token-secret-at-least-32-bytes",
  refreshTokenTtlSeconds: 7 * 24 * 60 * 60,
} as const satisfies AuthTokenConfig & { passwordScryptCost: number };

export const TEST_ENV_SECRETS = {
  ACCESS_TOKEN_SECRET: TEST_AUTH_CONFIG.accessTokenSecret,
  REFRESH_TOKEN_SECRET: TEST_AUTH_CONFIG.refreshTokenSecret,
} as const;
