import { createHash } from "node:crypto";

import type { AuthResponse } from "@gym-tracking/contracts";
import mongoose from "mongoose";

import { ApiError } from "../../shared/api-error.js";
import { toPublicUser } from "./auth.service.js";
import {
  RefreshSessionModel,
  type RefreshRevocationReason,
  type RefreshSessionRecord,
} from "./refresh-session.model.js";
import type { TokenService } from "./token.service.js";
import type { UserRepository } from "../users/user.repository.js";

export const REFRESH_COOKIE_NAME = "__Secure-gym_refresh";
export const REFRESH_COOKIE_PATH = "/api/v1/auth";

export interface RefreshServiceConfig {
  refreshTokenTtlSeconds: number;
}

export interface AuthResult {
  auth: AuthResponse;
  refreshToken: string;
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

function toObjectId(userId: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(userId);
}

export function createRefreshService(
  tokenService: TokenService,
  userRepository: UserRepository,
  config: RefreshServiceConfig,
) {
  async function createSession(userId: string, familyId?: string): Promise<string> {
    const issued = await tokenService.issueRefreshToken(userId, familyId);

    await RefreshSessionModel.create({
      activatedAt: new Date(),
      expiresAt: issued.expiresAt,
      familyId: issued.familyId,
      jti: issued.jti,
      revokedAt: null,
      tokenHash: hashRefreshToken(issued.token),
      userId: toObjectId(userId),
    });

    return issued.token;
  }

  async function revokeFamily(familyId: string, reason: RefreshRevocationReason): Promise<void> {
    await RefreshSessionModel.updateMany(
      { familyId, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: reason } },
    );
  }

  async function rejectRevokedSession(session: RefreshSessionRecord): Promise<never> {
    if (session.revokedReason === "ROTATED") {
      await revokeFamily(session.familyId, "REUSE_DETECTED");
    }

    throw new ApiError("UNAUTHENTICATED", "Authentication required");
  }

  async function authResult(userId: string, refreshToken: string): Promise<AuthResult> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    return {
      auth: {
        data: {
          accessToken: await tokenService.issueAccessToken(userId),
          user: toPublicUser(user),
        },
      },
      refreshToken,
    };
  }

  return {
    async createAuthSession(userId: string): Promise<string> {
      return createSession(userId);
    },

    async refresh(rawToken: string): Promise<AuthResult> {
      const claims = await tokenService.verifyRefreshToken(rawToken);
      const tokenHash = hashRefreshToken(rawToken);
      const session = await RefreshSessionModel.findOne({ tokenHash })
        .select("+tokenHash")
        .lean<RefreshSessionRecord>();

      if (
        !session ||
        session.jti !== claims.jti ||
        session.familyId !== claims.familyId ||
        session.userId.toString() !== claims.userId
      ) {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }

      if (session.revokedAt) {
        return rejectRevokedSession(session);
      }

      if (session.expiresAt.getTime() <= Date.now()) {
        await RefreshSessionModel.updateOne(
          { _id: session._id, revokedAt: null },
          { $set: { revokedAt: new Date(), revokedReason: "EXPIRED" } },
        );
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }

      const issued = await tokenService.issueRefreshToken(claims.userId, claims.familyId);
      const now = new Date();
      const rotated = await RefreshSessionModel.findOneAndUpdate(
        { _id: session._id, revokedAt: null },
        {
          $set: {
            replacedByJti: issued.jti,
            revokedAt: now,
            revokedReason: "ROTATED",
          },
        },
        { returnDocument: "after" },
      ).lean<RefreshSessionRecord>();

      if (!rotated) {
        return rejectRevokedSession(session);
      }

      await RefreshSessionModel.create({
        activatedAt: now,
        expiresAt: issued.expiresAt,
        familyId: issued.familyId,
        jti: issued.jti,
        revokedAt: null,
        tokenHash: hashRefreshToken(issued.token),
        userId: toObjectId(claims.userId),
      });

      return authResult(claims.userId, issued.token);
    },

    async logout(rawToken?: string): Promise<void> {
      if (!rawToken) {
        return;
      }

      let claims: Awaited<ReturnType<TokenService["verifyRefreshToken"]>>;

      try {
        claims = await tokenService.verifyRefreshToken(rawToken);
      } catch {
        return;
      }

      await RefreshSessionModel.updateOne(
        {
          familyId: claims.familyId,
          jti: claims.jti,
          tokenHash: hashRefreshToken(rawToken),
          revokedAt: null,
        },
        { $set: { revokedAt: new Date(), revokedReason: "LOGOUT" } },
      );
    },

    refreshCookieMaxAgeMs(): number {
      return config.refreshTokenTtlSeconds * 1_000;
    },
  };
}

export type RefreshService = ReturnType<typeof createRefreshService>;
