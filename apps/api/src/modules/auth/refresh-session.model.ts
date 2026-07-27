import mongoose, { model, Schema, type Model } from "mongoose";

export type RefreshRevocationReason =
  | "ROTATED"
  | "REUSE_DETECTED"
  | "LOGOUT"
  | "EXPIRED";

export interface RefreshSessionRecord {
  _id: mongoose.Types.ObjectId;
  activatedAt: Date;
  createdAt: Date;
  expiresAt: Date;
  familyId: string;
  jti: string;
  replacedByJti?: string;
  revokedAt: Date | null;
  revokedReason?: RefreshRevocationReason;
  tokenHash: string;
  updatedAt: Date;
  userId: mongoose.Types.ObjectId;
}

const refreshSessionSchema = new Schema<RefreshSessionRecord>(
  {
    activatedAt: { required: true, type: Date },
    expiresAt: { required: true, type: Date },
    familyId: { required: true, type: String },
    jti: { required: true, type: String },
    replacedByJti: { type: String },
    revokedAt: { default: null, type: Date },
    revokedReason: {
      enum: ["ROTATED", "REUSE_DETECTED", "LOGOUT", "EXPIRED"],
      type: String,
    },
    tokenHash: { required: true, select: false, type: String },
    userId: { ref: "User", required: true, type: Schema.Types.ObjectId },
  },
  {
    collection: "refreshSessions",
    timestamps: true,
  },
);

refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshSessionSchema.index({ jti: 1 }, { unique: true });
refreshSessionSchema.index({ tokenHash: 1 }, { unique: true });
refreshSessionSchema.index({ familyId: 1 });
refreshSessionSchema.index({ userId: 1, expiresAt: -1 });

export const RefreshSessionModel: Model<RefreshSessionRecord> =
  (mongoose.models.RefreshSession as Model<RefreshSessionRecord> | undefined) ??
  model<RefreshSessionRecord>("RefreshSession", refreshSessionSchema);
