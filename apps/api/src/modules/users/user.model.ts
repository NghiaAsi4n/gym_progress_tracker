import type { UserPreferences, UserRole } from "@gym-tracking/contracts";
import mongoose, { model, Schema, type Model } from "mongoose";

const preferencesSchema = new Schema<UserPreferences>(
  {
    locale: {
      default: "vi",
      enum: ["vi", "en"],
      required: true,
      type: String,
    },
    theme: {
      default: "SYSTEM",
      enum: ["LIGHT", "DARK", "SYSTEM"],
      required: true,
      type: String,
    },
    unit: {
      default: "KG",
      enum: ["KG", "LB"],
      required: true,
      type: String,
    },
  },
  { _id: false },
);

export interface UserRecord {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  normalizedEmail: string;
  passwordHash: string;
  preferences: UserPreferences;
  role?: UserRole;
  updatedAt: Date;
}

const userSchema = new Schema<UserRecord>(
  {
    normalizedEmail: {
      maxlength: 254,
      required: true,
      trim: true,
      type: String,
    },
    passwordHash: {
      required: true,
      select: false,
      type: String,
    },
    preferences: {
      default: () => ({
        locale: "vi",
        theme: "SYSTEM",
        unit: "KG",
      }),
      required: true,
      type: preferencesSchema,
    },
    role: {
      default: "USER",
      enum: ["USER", "ADMIN"],
      required: true,
      type: String,
    },
  },
  {
    collection: "users",
    timestamps: true,
  },
);

userSchema.index({ normalizedEmail: 1 }, { unique: true });

export const UserModel: Model<UserRecord> =
  (mongoose.models.User as Model<UserRecord> | undefined) ?? model<UserRecord>("User", userSchema);
