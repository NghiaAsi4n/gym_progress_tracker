import type { ExerciseQuery } from "@gym-tracking/contracts";
import type mongoose from "mongoose";

import { ExerciseModel, type ExerciseRecord } from "./exercise.model.js";

type CreateExerciseInput = Pick<
  ExerciseRecord,
  "name" | "muscleGroups" | "movementPattern" | "equipment" | "difficulty"
>;

// exactOptionalPropertyTypes: fields may be absent OR explicitly undefined
export type UpdateExerciseInput = {
  [K in keyof CreateExerciseInput]?: CreateExerciseInput[K] | undefined;
};

export interface PaginatedExercises {
  items: ExerciseRecord[];
  totalItems: number;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createExerciseRepository() {
  return {
    async create(
      input: CreateExerciseInput,
      ownerId: mongoose.Types.ObjectId,
    ): Promise<ExerciseRecord> {
      const exercise = await ExerciseModel.create({
        name: input.name,
        muscleGroups: input.muscleGroups,
        movementPattern: input.movementPattern,
        equipment: input.equipment,
        difficulty: input.difficulty,
        isSystem: false,
        ownerId,
      });
      return exercise.toObject<ExerciseRecord>();
    },

    async createSystem(input: CreateExerciseInput): Promise<ExerciseRecord> {
      const exercise = await ExerciseModel.create({
        name: input.name,
        muscleGroups: input.muscleGroups,
        movementPattern: input.movementPattern,
        equipment: input.equipment,
        difficulty: input.difficulty,
        isSystem: true,
      });
      return exercise.toObject<ExerciseRecord>();
    },

    async findById(id: string): Promise<ExerciseRecord | null> {
      return ExerciseModel.findById(id).lean<ExerciseRecord>() ?? null;
    },

    async findPaginated(userId: string, query: ExerciseQuery): Promise<PaginatedExercises> {
      const { page, pageSize, name, muscleGroup } = query;
      const skip = (page - 1) * pageSize;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filter: Record<string, any> = {
        $or: [{ isSystem: true }, { ownerId: userId }],
      };

      if (name) {
        filter["name"] = { $regex: escapeRegex(name), $options: "i" };
      }

      if (muscleGroup) {
        filter["muscleGroups"] = muscleGroup;
      }

      const [items, totalItems] = await Promise.all([
        ExerciseModel.find(filter)
          .sort({ isSystem: -1, name: 1 })
          .skip(skip)
          .limit(pageSize)
          .lean<ExerciseRecord[]>(),
        ExerciseModel.countDocuments(filter),
      ]);

      return { items, totalItems };
    },

    async update(id: string, input: UpdateExerciseInput): Promise<ExerciseRecord | null> {
      return (
        ExerciseModel.findByIdAndUpdate(
          id,
          { $set: input },
          { returnDocument: "after", runValidators: true },
        ).lean<ExerciseRecord>() ?? null
      );
    },

    async delete(id: string): Promise<boolean> {
      const result = await ExerciseModel.deleteOne({ _id: id });
      return result.deletedCount === 1;
    },

    async existsByName(name: string, ownerId: string): Promise<boolean> {
      const count = await ExerciseModel.countDocuments({
        name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
        $or: [{ isSystem: true }, { ownerId }],
      });
      return count > 0;
    },

    async existsSystemByName(name: string): Promise<boolean> {
      const count = await ExerciseModel.countDocuments({
        isSystem: true,
        name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
      });
      return count > 0;
    },

    async seedSystemExercises(
      exercises: Omit<ExerciseRecord, "_id" | "createdAt" | "updatedAt">[],
    ): Promise<void> {
      await ExerciseModel.bulkWrite(
        exercises.map((exercise) => ({
          updateOne: {
            filter: { name: exercise.name, isSystem: true },
            update: { $setOnInsert: exercise },
            upsert: true,
          },
        })),
        { ordered: true },
      );
    },
  };
}

export type ExerciseRepository = ReturnType<typeof createExerciseRepository>;
export type { ExerciseRecord } from "./exercise.model.js";
