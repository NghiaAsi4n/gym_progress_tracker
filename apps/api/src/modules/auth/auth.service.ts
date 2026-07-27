import type {
  LoginRequest,
  PublicUser,
  RegisterRequest,
} from "@gym-tracking/contracts";

import { ApiError } from "../../shared/api-error.js";
import type { UserRecord, UserRepository } from "../users/user.repository.js";
import type { PasswordService } from "./password.service.js";
import type { AuthResult, RefreshService } from "./refresh.service.js";
import type { TokenService } from "./token.service.js";

interface AuthServiceDependencies {
  passwordService: PasswordService;
  refreshService: RefreshService;
  tokenService: TokenService;
  userRepository: UserRepository;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11_000;
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    email: user.normalizedEmail,
    id: user._id.toString(),
    preferences: {
      locale: user.preferences.locale,
      theme: user.preferences.theme,
      unit: user.preferences.unit,
    },
  };
}

export function createAuthService({
  passwordService,
  refreshService,
  tokenService,
  userRepository,
}: AuthServiceDependencies) {
  async function createAuthResponse(user: UserRecord): Promise<AuthResult> {
    return {
      auth: {
        data: {
          accessToken: await tokenService.issueAccessToken(user._id.toString()),
          user: toPublicUser(user),
        },
      },
      refreshToken: await refreshService.createAuthSession(user._id.toString()),
    };
  }

  return {
    async login(input: LoginRequest): Promise<AuthResult> {
      const user = await userRepository.findCredentialsByEmail(input.email);
      const passwordMatches = await passwordService.verify(input.password, user?.passwordHash);

      if (!user || !passwordMatches) {
        throw new ApiError("UNAUTHENTICATED", "Invalid email or password");
      }

      return createAuthResponse(user);
    },

    async register(input: RegisterRequest): Promise<AuthResult> {
      const passwordHash = await passwordService.hash(input.password);

      try {
        const user = await userRepository.create({
          normalizedEmail: input.email,
          passwordHash,
        });
        return createAuthResponse(user);
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          throw new ApiError("CONFLICT", "Account already exists");
        }
        throw error;
      }
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
