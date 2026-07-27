import type { CalorieEstimate } from "@gym-tracking/contracts";

import { ApiError } from "../../shared/api-error.js";
import { BodyWeightModel } from "../body-weight/body-weight.module.js";
import { WorkoutModel } from "../workouts/workout.model.js";

const STRENGTH_TRAINING_MET = 6;

export async function calculateCalorieEstimate(
  userId: string,
  workoutDate: Date,
  durationSeconds: number,
): Promise<CalorieEstimate | null> {
  const date = workoutDate.toISOString().slice(0, 10);
  const bodyWeight = await BodyWeightModel.findOne({
    ownerId: userId,
    measuredOn: { $lte: date },
  })
    .sort({ measuredOn: -1 })
    .lean();
  if (!bodyWeight) return null;
  const durationMinutes = durationSeconds / 60;
  const estimatedCalories = Math.round(
    (STRENGTH_TRAINING_MET * 3.5 * bodyWeight.weightKg * durationMinutes) / 200,
  );
  return {
    estimatedCalories,
    bodyWeightKg: bodyWeight.weightKg,
    bodyWeightMeasuredOn: bodyWeight.measuredOn,
    met: STRENGTH_TRAINING_MET,
    durationMinutes,
    method: "MET_V1",
    sourceVersion: 1,
    calculatedAt: new Date().toISOString(),
  };
}

export async function recalculateWorkoutCalories(userId: string, workoutId: string) {
  const workout = await WorkoutModel.findOne({
    _id: workoutId,
    ownerId: userId,
    status: "COMPLETED",
  }).lean();
  if (!workout) throw new ApiError("NOT_FOUND", "Completed workout not found");
  const estimate = await calculateCalorieEstimate(
    userId,
    workout.startedAt,
    workout.durationSeconds ?? 0,
  );
  if (!estimate) {
    throw new ApiError("VALIDATION_ERROR", "Add a body-weight entry on or before this workout");
  }
  await WorkoutModel.updateOne(
    { _id: workout._id, ownerId: userId },
    { $set: { calorieEstimate: estimate } },
  );
  return { data: estimate };
}
