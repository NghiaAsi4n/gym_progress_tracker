import { UserModel, type UserRecord } from "./user.model.js";

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
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
export type { UserRecord } from "./user.model.js";
