import type {
  CreateExerciseRequest,
  Exercise,
  ExerciseQuery,
  PaginationMetadata,
  UpdateExerciseRequest,
} from "@gym-tracking/contracts";
import mongoose from "mongoose";

import { ApiError } from "../../shared/api-error.js";
import type { ExerciseRecord, ExerciseRepository } from "./exercise.repository.js";

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

export function createExerciseService(
  exerciseRepository: ExerciseRepository,
  isExerciseReferenced: (userId: string, exerciseId: string) => Promise<boolean> = () =>
    Promise.resolve(false),
) {
  function assertValidId(exerciseId: string): void {
    if (!mongoose.isValidObjectId(exerciseId)) {
      throw new ApiError("NOT_FOUND", "Exercise not found");
    }
  }

  return {
    async list(
      userId: string,
      query: ExerciseQuery,
    ): Promise<{ data: Exercise[]; pagination: PaginationMetadata }> {
      const { items, totalItems } = await exerciseRepository.findPaginated(userId, query);
      const totalPages = Math.ceil(totalItems / query.pageSize);

      return {
        data: items.map(toExercise),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
          totalPages,
        },
      };
    },

    async getById(userId: string, exerciseId: string): Promise<{ data: Exercise }> {
      assertValidId(exerciseId);
      const exercise = await exerciseRepository.findById(exerciseId);

      if (!exercise) {
        throw new ApiError("NOT_FOUND", "Exercise not found");
      }

      if (!exercise.isSystem && String(exercise.ownerId) !== userId) {
        throw new ApiError("NOT_FOUND", "Exercise not found");
      }

      return { data: toExercise(exercise) };
    },

    async create(userId: string, input: CreateExerciseRequest): Promise<{ data: Exercise }> {
      const exists = await exerciseRepository.existsByName(input.name, userId);

      if (exists) {
        throw new ApiError("CONFLICT", "An exercise with this name already exists");
      }

      const ownerId = new mongoose.Types.ObjectId(userId);
      const exercise = await exerciseRepository.create(input, ownerId);
      return { data: toExercise(exercise) };
    },

    async update(
      userId: string,
      exerciseId: string,
      input: UpdateExerciseRequest,
    ): Promise<{ data: Exercise }> {
      assertValidId(exerciseId);
      const existing = await exerciseRepository.findById(exerciseId);

      if (!existing) {
        throw new ApiError("NOT_FOUND", "Exercise not found");
      }

      if (existing.isSystem) {
        throw new ApiError("FORBIDDEN", "System exercises cannot be modified");
      }

      if (String(existing.ownerId) !== userId) {
        throw new ApiError("NOT_FOUND", "Exercise not found");
      }

      if (input.name && input.name !== existing.name) {
        const nameExists = await exerciseRepository.existsByName(input.name, userId);
        if (nameExists) {
          throw new ApiError("CONFLICT", "An exercise with this name already exists");
        }
      }

      const updated = await exerciseRepository.update(exerciseId, input);

      if (!updated) {
        throw new ApiError("NOT_FOUND", "Exercise not found");
      }

      return { data: toExercise(updated) };
    },

    async delete(userId: string, exerciseId: string): Promise<void> {
      assertValidId(exerciseId);
      const existing = await exerciseRepository.findById(exerciseId);

      if (!existing) {
        throw new ApiError("NOT_FOUND", "Exercise not found");
      }

      if (existing.isSystem) {
        throw new ApiError("FORBIDDEN", "System exercises cannot be deleted");
      }

      if (String(existing.ownerId) !== userId) {
        throw new ApiError("NOT_FOUND", "Exercise not found");
      }

      if (await isExerciseReferenced(userId, exerciseId)) {
        throw new ApiError("CONFLICT", "Exercise is used by a workout template");
      }

      await exerciseRepository.delete(exerciseId);
    },
  };
}

export type ExerciseService = ReturnType<typeof createExerciseService>;
