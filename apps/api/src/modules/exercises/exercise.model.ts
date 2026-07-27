import type { Difficulty, Equipment, MovementPattern, MuscleGroup } from "@gym-tracking/contracts";
import mongoose, { model, Schema, type Model } from "mongoose";

export interface ExerciseRecord {
  _id: mongoose.Types.ObjectId;
  name: string;
  muscleGroups: MuscleGroup[];
  movementPattern: MovementPattern;
  equipment: Equipment;
  difficulty: Difficulty;
  isSystem: boolean;
  ownerId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const exerciseSchema = new Schema<ExerciseRecord>(
  {
    name: {
      maxlength: 100,
      required: true,
      trim: true,
      type: String,
    },
    muscleGroups: {
      type: [String],
      required: true,
      enum: [
        "CHEST",
        "BACK",
        "SHOULDERS",
        "BICEPS",
        "TRICEPS",
        "LEGS",
        "GLUTES",
        "CORE",
        "CALVES",
        "FOREARMS",
        "FULL_BODY",
      ],
      validate: {
        validator: (values: MuscleGroup[]) => values.length >= 1 && values.length <= 5,
        message: "muscleGroups must contain between 1 and 5 values",
      },
    },
    movementPattern: {
      enum: ["PUSH", "PULL", "HINGE", "SQUAT", "CARRY", "ROTATION", "ISOLATION"],
      required: true,
      type: String,
    },
    equipment: {
      enum: [
        "BARBELL",
        "DUMBBELL",
        "CABLE",
        "MACHINE",
        "BODYWEIGHT",
        "KETTLEBELL",
        "RESISTANCE_BAND",
        "SMITH_MACHINE",
        "OTHER",
      ],
      required: true,
      type: String,
    },
    difficulty: {
      enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
      required: true,
      type: String,
    },
    isSystem: {
      default: false,
      required: true,
      type: Boolean,
    },
    ownerId: {
      ref: "User",
      type: Schema.Types.ObjectId,
    },
  },
  {
    collection: "exercises",
    timestamps: true,
  },
);

exerciseSchema.index(
  { isSystem: 1, ownerId: 1, name: 1 },
  { collation: { locale: "en", strength: 2 }, unique: true },
);
exerciseSchema.index({ ownerId: 1 });

export const ExerciseModel: Model<ExerciseRecord> =
  (mongoose.models.Exercise as Model<ExerciseRecord> | undefined) ??
  model<ExerciseRecord>("Exercise", exerciseSchema);
