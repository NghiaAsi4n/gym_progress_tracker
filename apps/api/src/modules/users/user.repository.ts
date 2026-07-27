import { UserModel, type UserRecord } from "./user.model.js";
import type { UserPreferences } from "@gym-tracking/contracts";

export interface CreateUserRecord {
  normalizedEmail: string;
  passwordHash: string;
}

export function createUserRepository() {
  return {
    async create(input: CreateUserRecord): Promise<UserRecord> {
      const user = await UserModel.create(input);
      return user.toObject<UserRecord>();
    },

    async findById(userId: string): Promise<UserRecord | null> {
      return UserModel.findById(userId).lean<UserRecord>();
    },

    async findCredentialsByEmail(normalizedEmail: string): Promise<UserRecord | null> {
      return UserModel.findOne({ normalizedEmail }).select("+passwordHash").lean<UserRecord>();
    },

    async updatePreferences(
      userId: string,
      preferences: Partial<UserPreferences>,
    ): Promise<UserRecord | null> {
      return UserModel.findOneAndUpdate(
        { _id: userId },
        {
          $set: Object.fromEntries(
            Object.entries(preferences).map(([key, value]) => [`preferences.${key}`, value]),
          ),
        },
        { new: true, runValidators: true },
      ).lean<UserRecord>();
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
export type { UserRecord } from "./user.model.js";
