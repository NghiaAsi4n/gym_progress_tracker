import mongoose, { model, Schema, type Model } from "mongoose";
import type { CalorieEstimate } from "@gym-tracking/contracts";

export interface WorkoutSetRecord {
  id: mongoose.Types.ObjectId;
  order: number;
  weightKg: number | null;
  reps: number | null;
  isComplete: boolean;
  notes: string;
}

export interface WorkoutExerciseRecord {
  id: mongoose.Types.ObjectId;
  exerciseId: mongoose.Types.ObjectId;
  name: string;
  order: number;
  sets: WorkoutSetRecord[];
}

export interface WorkoutSourceRecord {
  type: "EMPTY" | "TEMPLATE" | "SCHEDULED";
  templateId?: mongoose.Types.ObjectId;
  templateName?: string;
  planId?: mongoose.Types.ObjectId;
  planName?: string;
  scheduledDate?: string;
}

export interface WorkoutRecord {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  source: WorkoutSourceRecord;
  exercises: WorkoutExerciseRecord[];
  notes: string;
  version: number;
  startedAt: Date;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  durationSeconds?: number | null;
  volumeKg?: number | null;
  calorieEstimate?: CalorieEstimate | null;
  createdAt: Date;
  updatedAt: Date;
}

const setSchema = new Schema<WorkoutSetRecord>(
  {
    id: { type: Schema.Types.ObjectId, required: true },
    order: { type: Number, required: true, min: 0 },
    weightKg: { type: Number, default: null, min: 0, max: 1_000 },
    reps: { type: Number, default: null, min: 0, max: 1_000 },
    isComplete: { type: Boolean, required: true, default: false },
    notes: { type: String, required: true, default: "", maxlength: 500 },
  },
  { _id: false },
);

const exerciseSchema = new Schema<WorkoutExerciseRecord>(
  {
    id: { type: Schema.Types.ObjectId, required: true },
    exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise", required: true },
    name: { type: String, required: true, maxlength: 120 },
    order: { type: Number, required: true, min: 0 },
    sets: { type: [setSchema], required: true, default: [] },
  },
  { _id: false },
);

const sourceSchema = new Schema<WorkoutSourceRecord>(
  {
    type: { type: String, enum: ["EMPTY", "TEMPLATE", "SCHEDULED"], required: true },
    templateId: { type: Schema.Types.ObjectId, ref: "WorkoutTemplate" },
    templateName: { type: String, maxlength: 100 },
    planId: { type: Schema.Types.ObjectId, ref: "TrainingPlan" },
    planName: { type: String, maxlength: 100 },
    scheduledDate: String,
  },
  { _id: false },
);

const workoutSchema = new Schema<WorkoutRecord>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "CANCELLED"],
      required: true,
      default: "ACTIVE",
    },
    source: { type: sourceSchema, required: true },
    exercises: { type: [exerciseSchema], required: true, default: [] },
    notes: { type: String, required: true, default: "", maxlength: 2_000 },
    version: { type: Number, required: true, default: 1, min: 1 },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: null, min: 0 },
    volumeKg: { type: Number, default: null, min: 0 },
    calorieEstimate: { type: Schema.Types.Mixed, default: null },
  },
  { collection: "workouts", timestamps: true, versionKey: false },
);

workoutSchema.index(
  { ownerId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "ACTIVE" } },
);
workoutSchema.index({ ownerId: 1, startedAt: -1 });

export const WorkoutModel: Model<WorkoutRecord> =
  (mongoose.models.Workout as Model<WorkoutRecord> | undefined) ??
  model<WorkoutRecord>("Workout", workoutSchema);
