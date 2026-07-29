import type { UserRole } from "@gym-tracking/contracts";

import type { PasswordService } from "../auth/password.service.js";
import type { CreateUserRecord, UserRepository } from "./user.repository.js";

interface AdminCredentials {
  email: string;
  password: string;
}

type AdminRepository = Pick<UserRepository, "create" | "findByEmail" | "updateRoleByEmail">;
type PasswordHasher = Pick<PasswordService, "hash">;

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11_000;
}

export function createAdminBootstrapService(
  repository: AdminRepository,
  passwordService: PasswordHasher,
) {
  async function promote(email: string, role: UserRole): Promise<void> {
    const updated = await repository.updateRoleByEmail(email, role);
    if (!updated) {
      throw new Error("Unable to provision administrator account");
    }
  }

  return {
    async ensureAdmin(credentials: AdminCredentials): Promise<void> {
      const existing = await repository.findByEmail(credentials.email);

      if (existing) {
        if (existing.role !== "ADMIN") {
          await promote(credentials.email, "ADMIN");
        }
        return;
      }

      const input: CreateUserRecord = {
        normalizedEmail: credentials.email,
        passwordHash: await passwordService.hash(credentials.password),
        role: "ADMIN",
      };

      try {
        await repository.create(input);
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          throw error;
        }
        await promote(credentials.email, "ADMIN");
      }
    },
  };
}
