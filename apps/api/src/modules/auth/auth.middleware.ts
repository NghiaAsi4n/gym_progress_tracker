import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../../shared/api-error.js";
import type { TokenService } from "./token.service.js";

export function createAuthenticateMiddleware(tokenService: TokenService) {
  return async function authenticate(
    request: Request,
    _response: Response,
    next: NextFunction,
  ): Promise<void> {
    const authorization = request.header("Authorization");
    const match = authorization?.match(/^Bearer ([^\s]+)$/i);

    if (!match?.[1]) {
      next(new ApiError("UNAUTHENTICATED", "Authentication required"));
      return;
    }

    try {
      request.auth = {
        userId: await tokenService.verifyAccessToken(match[1]),
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}
