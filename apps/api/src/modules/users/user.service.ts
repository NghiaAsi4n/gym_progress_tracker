import type {
  MeResponse,
  PreferencesPatchRequest,
  PreferencesResponse,
  UserPreferences,
} from "@gym-tracking/contracts";

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

    async updatePreferences(
      userId: string,
      input: PreferencesPatchRequest,
    ): Promise<PreferencesResponse> {
      const definedPreferences: Partial<UserPreferences> = {};
      if (input.locale !== undefined) definedPreferences.locale = input.locale;
      if (input.theme !== undefined) definedPreferences.theme = input.theme;
      if (input.unit !== undefined) definedPreferences.unit = input.unit;
      const user = await userRepository.updatePreferences(userId, definedPreferences);

      if (!user) {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }

      return { data: { user: toPublicUser(user) } };
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
