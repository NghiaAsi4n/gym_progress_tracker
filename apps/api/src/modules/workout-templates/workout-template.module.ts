import {
  createWorkoutTemplateRequestSchema,
  updateWorkoutTemplateRequestSchema,
  type Exercise,
  type WorkoutTemplate,
} from "@gym-tracking/contracts";
import { Router, type RequestHandler } from "express";
import mongoose, { model, Schema, type Model } from "mongoose";

import { ApiError } from "../../shared/api-error.js";
import { validateInput } from "../../shared/validate.js";
import { ExerciseModel, type ExerciseRecord } from "../exercises/exercise.model.js";

export interface WorkoutTemplateRecord {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  name: string;
  exerciseIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<WorkoutTemplateRecord>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    exerciseIds: [{ type: Schema.Types.ObjectId, ref: "Exercise", required: true }],
  },
  { collection: "workoutTemplates", timestamps: true },
);
schema.index({ ownerId: 1, updatedAt: -1 });

export const WorkoutTemplateModel: Model<WorkoutTemplateRecord> =
  (mongoose.models.WorkoutTemplate as Model<WorkoutTemplateRecord> | undefined) ??
  model<WorkoutTemplateRecord>("WorkoutTemplate", schema);

function toExercise(record: ExerciseRecord): Exercise {
  return {
    id: String(record._id),
    name: record.name,
    muscleGroups: record.muscleGroups,
    movementPattern: record.movementPattern,
    equipment: record.equipment,
    difficulty: record.difficulty,
    isSystem: record.isSystem,
    ownerId: record.ownerId ? String(record.ownerId) : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function createWorkoutTemplateService() {
  async function findOwned(userId: string, id: string): Promise<WorkoutTemplateRecord> {
    if (!mongoose.isValidObjectId(id)) throw new ApiError("NOT_FOUND", "Template not found");
    const template = await WorkoutTemplateModel.findOne({ _id: id, ownerId: userId }).lean();
    if (!template) throw new ApiError("NOT_FOUND", "Template not found");
    return template;
  }

  async function validateExercises(userId: string, exerciseIds: string[]): Promise<void> {
    const available = await ExerciseModel.countDocuments({
      _id: { $in: exerciseIds },
      $or: [{ isSystem: true }, { ownerId: userId }],
    });
    if (available !== exerciseIds.length) {
      throw new ApiError("VALIDATION_ERROR", "One or more exercises are unavailable");
    }
  }

  async function present(record: WorkoutTemplateRecord): Promise<WorkoutTemplate> {
    const exercises = await ExerciseModel.find({ _id: { $in: record.exerciseIds } }).lean<
      ExerciseRecord[]
    >();
    const byId = new Map(exercises.map((exercise) => [String(exercise._id), exercise]));
    return {
      id: String(record._id),
      ownerId: String(record.ownerId),
      name: record.name,
      exercises: record.exerciseIds.map((exerciseId, order) => {
        const exercise = byId.get(String(exerciseId));
        if (!exercise) throw new ApiError("CONFLICT", "Template references a missing exercise");
        return { exerciseId: String(exerciseId), order, exercise: toExercise(exercise) };
      }),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  return {
    async list(userId: string) {
      const records = await WorkoutTemplateModel.find({ ownerId: userId })
        .sort({ updatedAt: -1 })
        .lean();
      return { data: await Promise.all(records.map(present)) };
    },
    async get(userId: string, id: string) {
      return { data: await present(await findOwned(userId, id)) };
    },
    async create(userId: string, input: { name: string; exerciseIds: string[] }) {
      await validateExercises(userId, input.exerciseIds);
      const record = await WorkoutTemplateModel.create({
        ownerId: userId,
        name: input.name,
        exerciseIds: input.exerciseIds,
      });
      return { data: await present(record.toObject()) };
    },
    async update(
      userId: string,
      id: string,
      input: { name?: string | undefined; exerciseIds?: string[] | undefined },
    ) {
      await findOwned(userId, id);
      if (input.exerciseIds) await validateExercises(userId, input.exerciseIds);
      const record = await WorkoutTemplateModel.findOneAndUpdate(
        { _id: id, ownerId: userId },
        { $set: input },
        { returnDocument: "after", runValidators: true },
      ).lean();
      if (!record) throw new ApiError("NOT_FOUND", "Template not found");
      return { data: await present(record) };
    },
    async delete(userId: string, id: string) {
      await findOwned(userId, id);
      const inUse = await mongoose.connection.collection("trainingPlans").countDocuments({
        ownerId: new mongoose.Types.ObjectId(userId),
        "schedule.templateId": new mongoose.Types.ObjectId(id),
      });
      if (inUse) throw new ApiError("CONFLICT", "Template is used by a training plan");
      const result = await WorkoutTemplateModel.deleteOne({ _id: id, ownerId: userId });
      if (!result.deletedCount) throw new ApiError("NOT_FOUND", "Template not found");
    },
    async isExerciseReferenced(userId: string, exerciseId: string) {
      return (
        (await WorkoutTemplateModel.countDocuments({ ownerId: userId, exerciseIds: exerciseId })) >
        0
      );
    },
    findOwned,
  };
}

export type WorkoutTemplateService = ReturnType<typeof createWorkoutTemplateService>;

export function createWorkoutTemplateRouter(
  authenticate: RequestHandler,
  service: WorkoutTemplateService,
) {
  const router = Router();
  router.use(authenticate);
  router.get("/", async (request, response) => {
    response.json(await service.list(request.auth!.userId));
  });
  router.post("/", async (request, response) => {
    const input = validateInput(createWorkoutTemplateRequestSchema, request.body);
    response.status(201).json(await service.create(request.auth!.userId, input));
  });
  router.get("/:id", async (request, response) => {
    response.json(await service.get(request.auth!.userId, request.params.id));
  });
  router.patch("/:id", async (request, response) => {
    const input = validateInput(updateWorkoutTemplateRequestSchema, request.body);
    response.json(await service.update(request.auth!.userId, request.params.id, input));
  });
  router.delete("/:id", async (request, response) => {
    await service.delete(request.auth!.userId, request.params.id);
    response.status(204).end();
  });
  return router;
}
