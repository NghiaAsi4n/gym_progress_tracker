import {
  progressRangeQuerySchema,
  type ExerciseProgress,
  type ProgressRangeQuery,
} from "@gym-tracking/contracts";
import { Router, type RequestHandler } from "express";
import mongoose from "mongoose";

import { validateInput } from "../../shared/validate.js";
import { WorkoutModel } from "../workouts/workout.model.js";
import { recalculateWorkoutCalories } from "./calorie-estimate.service.js";

interface MutableExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  points: Map<
    string,
    {
      date: string;
      volumeKg: number;
      bestWeightKg: number;
      estimated1RmKg: number;
      completedSets: number;
    }
  >;
}

export function createProgressService() {
  async function exercises(userId: string, query: ProgressRangeQuery) {
    const from = new Date(`${query.from}T00:00:00.000Z`);
    const toExclusive = new Date(`${query.to}T00:00:00.000Z`);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    const workouts = await WorkoutModel.find({
      ownerId: new mongoose.Types.ObjectId(userId),
      status: "COMPLETED",
      startedAt: { $gte: from, $lt: toExclusive },
    })
      .select("startedAt exercises")
      .sort({ startedAt: 1 })
      .lean();
    const byExercise = new Map<string, MutableExerciseProgress>();
    for (const workout of workouts) {
      const date = workout.startedAt.toISOString().slice(0, 10);
      for (const exercise of workout.exercises) {
        const completed = exercise.sets.filter(
          (set) => set.isComplete && set.weightKg !== null && set.reps !== null,
        );
        if (!completed.length) continue;
        const exerciseId = String(exercise.exerciseId);
        const entry = byExercise.get(exerciseId) ?? {
          exerciseId,
          exerciseName: exercise.name,
          points: new Map(),
        };
        const point = entry.points.get(date) ?? {
          date,
          volumeKg: 0,
          bestWeightKg: 0,
          estimated1RmKg: 0,
          completedSets: 0,
        };
        for (const set of completed) {
          const weight = set.weightKg ?? 0;
          const reps = set.reps ?? 0;
          point.volumeKg += weight * reps;
          point.bestWeightKg = Math.max(point.bestWeightKg, weight);
          point.estimated1RmKg = Math.max(point.estimated1RmKg, weight * (1 + reps / 30));
          point.completedSets += 1;
        }
        entry.points.set(date, point);
        byExercise.set(exerciseId, entry);
      }
    }
    const dayCount =
      Math.floor((toExclusive.getTime() - from.getTime()) / 86_400_000) || 1;
    const data: ExerciseProgress[] = [...byExercise.values()].map((entry) => {
      const timeSeries = [...entry.points.values()];
      let runningPr = 0;
      const prDates = timeSeries
        .filter((point) => {
          if (point.estimated1RmKg <= runningPr) return false;
          runningPr = point.estimated1RmKg;
          return true;
        })
        .map(({ date }) => date);
      return {
        exerciseId: entry.exerciseId,
        exerciseName: entry.exerciseName,
        bestWeightKg: Math.max(...timeSeries.map(({ bestWeightKg }) => bestWeightKg)),
        totalVolumeKg: timeSeries.reduce((sum, point) => sum + point.volumeKg, 0),
        bestEstimated1RmKg: Math.max(
          ...timeSeries.map(({ estimated1RmKg }) => estimated1RmKg),
        ),
        weeklySets:
          Math.round(
            (timeSeries.reduce((sum, point) => sum + point.completedSets, 0) /
              Math.max(1, dayCount / 7)) *
              10,
          ) / 10,
        prDates,
        timeSeries,
      };
    });
    return { data: data.sort((a, b) => b.totalVolumeKg - a.totalVolumeKg) };
  }

  return { exercises, recalculateCalories: recalculateWorkoutCalories };
}

export function createProgressRouter(
  authenticate: RequestHandler,
  service: ReturnType<typeof createProgressService>,
) {
  const router = Router();
  router.use(authenticate);
  router.get("/exercises", async (request, response) => {
    const query = validateInput(progressRangeQuerySchema, request.query);
    response.json(await service.exercises(request.auth!.userId, query));
  });
  router.post("/calorie-estimates/:workoutId", async (request, response) => {
    response.json(
      await service.recalculateCalories(request.auth!.userId, request.params.workoutId),
    );
  });
  return router;
}
