import {
  type CreateWorkoutDraftRequest,
  type UpdateWorkoutDraftRequest,
  type Workout,
  type WorkoutHistoryQuery,
} from "@gym-tracking/contracts";
import mongoose from "mongoose";

import { ApiError } from "../../shared/api-error.js";
import { ExerciseModel, type ExerciseRecord } from "../exercises/exercise.model.js";
import { calculateCalorieEstimate } from "../progress/calorie-estimate.service.js";
import type { createTrainingPlanService } from "../training-plans/training-plan.module.js";
import type { WorkoutTemplateService } from "../workout-templates/workout-template.module.js";
import {
  WorkoutModel,
  type WorkoutExerciseRecord,
  type WorkoutRecord,
  type WorkoutSourceRecord,
} from "./workout.model.js";

type TrainingPlanService = ReturnType<typeof createTrainingPlanService>;

function present(record: WorkoutRecord): Workout {
  const source =
    record.source.type === "SCHEDULED"
      ? {
          type: "SCHEDULED" as const,
          planId: String(record.source.planId),
          planName: record.source.planName!,
          templateId: String(record.source.templateId),
          templateName: record.source.templateName!,
          scheduledDate: record.source.scheduledDate!,
        }
      : record.source.type === "TEMPLATE"
        ? {
            type: "TEMPLATE" as const,
            templateId: String(record.source.templateId),
            templateName: record.source.templateName!,
          }
        : { type: "EMPTY" as const };

  return {
    id: String(record._id),
    ownerId: String(record.ownerId),
    status: record.status,
    source,
    exercises: record.exercises.map((exercise) => ({
      id: String(exercise.id),
      exerciseId: String(exercise.exerciseId),
      name: exercise.name,
      order: exercise.order,
      sets: exercise.sets.map((set) => ({
        id: String(set.id),
        order: set.order,
        weightKg: set.weightKg,
        reps: set.reps,
        isComplete: set.isComplete,
        notes: set.notes,
      })),
    })),
    notes: record.notes,
    version: record.version,
    startedAt: record.startedAt.toISOString(),
    completedAt: record.completedAt?.toISOString() ?? null,
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    durationSeconds: record.durationSeconds ?? null,
    volumeKg: record.volumeKg ?? null,
    calorieEstimate: record.calorieEstimate ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function defaultSets() {
  return Array.from({ length: 3 }, (_, order) => ({
    id: new mongoose.Types.ObjectId(),
    order,
    weightKg: null,
    reps: null,
    isComplete: false,
    notes: "",
  }));
}

function calculateVolume(exercises: WorkoutExerciseRecord[]): number {
  return exercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.reduce(
        (exerciseTotal, set) =>
          exerciseTotal +
          (set.isComplete && set.weightKg !== null && set.reps !== null
            ? set.weightKg * set.reps
            : 0),
        0,
      ),
    0,
  );
}

export function createWorkoutService(
  templateService: WorkoutTemplateService,
  planService: TrainingPlanService,
) {
  async function findOwned(userId: string, id: string): Promise<WorkoutRecord> {
    if (!mongoose.isValidObjectId(id)) throw new ApiError("NOT_FOUND", "Workout not found");
    const workout = await WorkoutModel.findOne({ _id: id, ownerId: userId }).lean();
    if (!workout) throw new ApiError("NOT_FOUND", "Workout not found");
    return workout;
  }

  async function sourceAndExercises(
    userId: string,
    input: CreateWorkoutDraftRequest,
  ): Promise<{ source: WorkoutSourceRecord; exercises: WorkoutExerciseRecord[] }> {
    if (input.source.type === "EMPTY") return { source: { type: "EMPTY" }, exercises: [] };

    const template = await templateService.findOwned(userId, input.source.templateId);
    const records = await ExerciseModel.find({
      _id: { $in: template.exerciseIds },
      $or: [{ isSystem: true }, { ownerId: userId }],
    }).lean<ExerciseRecord[]>();
    const byId = new Map(records.map((exercise) => [String(exercise._id), exercise]));
    const exercises = template.exerciseIds.map((exerciseId, order) => {
      const exercise = byId.get(String(exerciseId));
      if (!exercise) throw new ApiError("CONFLICT", "Template contains an unavailable exercise");
      return {
        id: new mongoose.Types.ObjectId(),
        exerciseId,
        name: exercise.name,
        order,
        sets: defaultSets(),
      };
    });

    if (input.source.type === "TEMPLATE") {
      return {
        source: {
          type: "TEMPLATE",
          templateId: template._id,
          templateName: template.name,
        },
        exercises,
      };
    }

    const scheduledSource = input.source;
    const plan = await planService.findOwned(userId, scheduledSource.planId);
    const templateBelongsToPlan = plan.schedule.some(
      ({ templateId }) => String(templateId) === scheduledSource.templateId,
    );
    if (!templateBelongsToPlan) {
      throw new ApiError("VALIDATION_ERROR", "Template is not scheduled by this plan");
    }
    return {
      source: {
        type: "SCHEDULED",
        planId: plan._id,
        planName: plan.name,
        templateId: template._id,
        templateName: template.name,
        scheduledDate: scheduledSource.scheduledDate,
      },
      exercises,
    };
  }

  async function normalizeExercises(
    userId: string,
    exercises: UpdateWorkoutDraftRequest["exercises"],
  ): Promise<WorkoutExerciseRecord[]> {
    if (!exercises) return [];
    const exerciseIds = exercises.map(({ exerciseId }) => exerciseId);
    if (new Set(exerciseIds).size !== exerciseIds.length) {
      throw new ApiError("VALIDATION_ERROR", "Exercises must be unique");
    }
    const available = await ExerciseModel.find({
      _id: { $in: exerciseIds },
      $or: [{ isSystem: true }, { ownerId: userId }],
    }).lean<ExerciseRecord[]>();
    if (available.length !== exerciseIds.length) {
      throw new ApiError("VALIDATION_ERROR", "One or more exercises are unavailable");
    }
    const names = new Map(available.map((exercise) => [String(exercise._id), exercise.name]));
    return [...exercises]
      .sort((a, b) => a.order - b.order)
      .map((exercise, order) => {
        if (new Set(exercise.sets.map(({ id }) => id)).size !== exercise.sets.length) {
          throw new ApiError("VALIDATION_ERROR", "Set ids must be unique within an exercise");
        }
        return {
          id: new mongoose.Types.ObjectId(exercise.id),
          exerciseId: new mongoose.Types.ObjectId(exercise.exerciseId),
          name: names.get(exercise.exerciseId)!,
          order,
          sets: [...exercise.sets]
            .sort((a, b) => a.order - b.order)
            .map((set, setOrder) => ({
              id: new mongoose.Types.ObjectId(set.id),
              order: setOrder,
              weightKg: set.weightKg,
              reps: set.reps,
              isComplete: set.isComplete,
              notes: set.notes,
            })),
        };
      });
  }

  async function transition(
    userId: string,
    id: string,
    version: number,
    status: "COMPLETED" | "CANCELLED",
  ) {
    const current = await findOwned(userId, id);
    if (current.status !== "ACTIVE") throw new ApiError("CONFLICT", "Workout is already closed");
    if (current.version !== version) throw new ApiError("CONFLICT", "Workout draft is out of date");
    if (
      status === "COMPLETED" &&
      !current.exercises.some((exercise) => exercise.sets.some((set) => set.isComplete))
    ) {
      throw new ApiError("VALIDATION_ERROR", "Complete at least one set before finishing");
    }
    const now = new Date();
    const durationSeconds = Math.max(
      0,
      Math.round((now.getTime() - current.startedAt.getTime()) / 1_000),
    );
    const calorieEstimate =
      status === "COMPLETED"
        ? await calculateCalorieEstimate(userId, current.startedAt, durationSeconds)
        : null;
    const record = await WorkoutModel.findOneAndUpdate(
      { _id: id, ownerId: userId, status: "ACTIVE", version },
      {
        $set: {
          status,
          durationSeconds,
          volumeKg: calculateVolume(current.exercises),
          calorieEstimate,
          ...(status === "COMPLETED" ? { completedAt: now } : { cancelledAt: now }),
        },
        $inc: { version: 1 },
      },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!record) throw new ApiError("CONFLICT", "Workout draft changed before it was closed");
    return { data: present(record) };
  }

  return {
    async getActive(userId: string) {
      const record = await WorkoutModel.findOne({ ownerId: userId, status: "ACTIVE" }).lean();
      if (!record) throw new ApiError("NOT_FOUND", "No active workout");
      return { data: present(record) };
    },
    async createDraft(userId: string, input: CreateWorkoutDraftRequest) {
      if (await WorkoutModel.exists({ ownerId: userId, status: "ACTIVE" })) {
        throw new ApiError("CONFLICT", "Finish or cancel the active workout first");
      }
      const initial = await sourceAndExercises(userId, input);
      try {
        const record = await WorkoutModel.create({ ownerId: userId, ...initial });
        return { data: present(record.toObject()) };
      } catch (error) {
        if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
          throw new ApiError("CONFLICT", "Finish or cancel the active workout first");
        }
        throw error;
      }
    },
    async updateDraft(userId: string, id: string, input: UpdateWorkoutDraftRequest) {
      const current = await findOwned(userId, id);
      if (current.status !== "ACTIVE") throw new ApiError("CONFLICT", "Workout is already closed");
      if (current.version !== input.version) {
        throw new ApiError("CONFLICT", "Workout draft is out of date");
      }
      const set: Record<string, unknown> = {};
      if (input.notes !== undefined) set.notes = input.notes;
      if (input.exercises !== undefined) {
        set.exercises = await normalizeExercises(userId, input.exercises);
      }
      const record = await WorkoutModel.findOneAndUpdate(
        { _id: id, ownerId: userId, status: "ACTIVE", version: input.version },
        { $set: set, $inc: { version: 1 } },
        { returnDocument: "after", runValidators: true },
      ).lean();
      if (!record) throw new ApiError("CONFLICT", "Workout draft changed while saving");
      return { data: present(record) };
    },
    complete(userId: string, id: string, version: number) {
      return transition(userId, id, version, "COMPLETED");
    },
    cancel(userId: string, id: string, version: number) {
      return transition(userId, id, version, "CANCELLED");
    },
    async listHistory(userId: string, query: WorkoutHistoryQuery) {
      const historyStatuses: Array<WorkoutRecord["status"]> = ["COMPLETED", "CANCELLED"];
      const filter = { ownerId: userId, status: { $in: historyStatuses } };
      const [records, totalItems] = await Promise.all([
        WorkoutModel.find(filter)
          .sort({ startedAt: -1 })
          .skip((query.page - 1) * query.pageSize)
          .limit(query.pageSize)
          .lean(),
        WorkoutModel.countDocuments(filter),
      ]);
      return {
        data: records.map(present),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / query.pageSize),
        },
      };
    },
    async get(userId: string, id: string) {
      return { data: present(await findOwned(userId, id)) };
    },
  };
}

export type WorkoutService = ReturnType<typeof createWorkoutService>;
