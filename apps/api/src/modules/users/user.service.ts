import type { MeResponse } from "@gym-tracking/contracts";

import { ApiError } from "../../shared/api-error.js";
import { toPublicUser } from "../auth/auth.service.js";
import type { UserRepository } from "./user.repository.js";

export function createUserService(userRepository: UserRepository) {
  return {
    async getMe(userId: string): Promise<MeResponse> {
      const user = await userRepository.findById(userId);

      if (!user) {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }

      return {
        data: {
          user: toPublicUser(user),
        },
      };
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
