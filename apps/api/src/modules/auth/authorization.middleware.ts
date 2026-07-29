import type { UserRole } from "@gym-tracking/contracts";
import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../../shared/api-error.js";
import type { UserRepository } from "../users/user.repository.js";

export function createRequireRoleMiddleware(
  userRepository: Pick<UserRepository, "findById">,
  requiredRole: UserRole,
) {
  return async function requireRole(
    request: Request,
    _response: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await userRepository.findById(request.auth!.userId);

      if (!user) {
        next(new ApiError("UNAUTHENTICATED", "Authentication required"));
        return;
      }
      if ((user.role ?? "USER") !== requiredRole) {
        next(new ApiError("FORBIDDEN", "Administrator access required"));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
