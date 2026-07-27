import { randomUUID } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";

import { ApiError } from "../../shared/api-error.js";

const JWT_ALGORITHM = "HS256";

export interface AuthTokenConfig {
  accessTokenAudience: string;
  accessTokenIssuer: string;
  accessTokenSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenSecret: string;
  refreshTokenTtlSeconds: number;
}

export function createTokenService(config: AuthTokenConfig) {
  const accessKey = new TextEncoder().encode(config.accessTokenSecret);
  const refreshKey = new TextEncoder().encode(config.refreshTokenSecret);

  return {
    async issueAccessToken(userId: string): Promise<string> {
      return new SignJWT({ type: "access" })
        .setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
        .setAudience(config.accessTokenAudience)
        .setExpirationTime(`${config.accessTokenTtlSeconds}s`)
        .setIssuedAt()
        .setIssuer(config.accessTokenIssuer)
        .setJti(randomUUID())
        .setSubject(userId)
        .sign(accessKey);
    },

    async verifyAccessToken(token: string): Promise<string> {
      try {
        const { payload } = await jwtVerify(token, accessKey, {
          algorithms: [JWT_ALGORITHM],
          audience: config.accessTokenAudience,
          issuer: config.accessTokenIssuer,
        });

        if (
          payload.type !== "access" ||
          typeof payload.sub !== "string" ||
          !/^[\da-f]{24}$/.test(payload.sub)
        ) {
          throw new Error("Invalid access claims");
        }

        return payload.sub;
      } catch {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }
    },

    async issueRefreshToken(userId: string, familyId: string = randomUUID()) {
      const jti = randomUUID();

      const token = await new SignJWT({ familyId, type: "refresh" })
        .setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
        .setAudience(config.accessTokenAudience)
        .setExpirationTime(`${config.refreshTokenTtlSeconds}s`)
        .setIssuedAt()
        .setIssuer(config.accessTokenIssuer)
        .setJti(jti)
        .setSubject(userId)
        .sign(refreshKey);

      return {
        expiresAt: new Date(Date.now() + config.refreshTokenTtlSeconds * 1_000),
        familyId,
        jti,
        token,
      };
    },

    async verifyRefreshToken(token: string) {
      try {
        const { payload } = await jwtVerify(token, refreshKey, {
          algorithms: [JWT_ALGORITHM],
          audience: config.accessTokenAudience,
          issuer: config.accessTokenIssuer,
        });

        if (
          payload.type !== "refresh" ||
          typeof payload.sub !== "string" ||
          !/^[\da-f]{24}$/.test(payload.sub) ||
          typeof payload.jti !== "string" ||
          typeof payload.familyId !== "string" ||
          payload.familyId.length < 1
        ) {
          throw new Error("Invalid refresh claims");
        }

        return {
          familyId: payload.familyId,
          jti: payload.jti,
          userId: payload.sub,
        };
      } catch {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }
    },
  };
}

export type TokenService = ReturnType<typeof createTokenService>;
