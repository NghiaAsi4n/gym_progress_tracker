import {
  createExerciseRequestSchema,
  exerciseQuerySchema,
  updateExerciseRequestSchema,
} from "@gym-tracking/contracts";
import type { Request, Response } from "express";

import { validateInput } from "../../shared/validate.js";
import type { ExerciseService } from "./exercise.service.js";

export function createExerciseController(exerciseService: ExerciseService) {
  return {
    list: async (request: Request, response: Response): Promise<void> => {
      const query = validateInput(exerciseQuerySchema, request.query);
      const result = await exerciseService.list(request.auth!.userId, query);
      response.status(200).json(result);
    },

    getById: async (request: Request<{ id: string }>, response: Response): Promise<void> => {
      const result = await exerciseService.getById(request.auth!.userId, request.params.id);
      response.status(200).json(result);
    },

    create: async (request: Request, response: Response): Promise<void> => {
      const input = validateInput(createExerciseRequestSchema, request.body);
      const result = await exerciseService.create(request.auth!.userId, input);
      response.status(201).json(result);
    },

    createSystem: async (request: Request, response: Response): Promise<void> => {
      const input = validateInput(createExerciseRequestSchema, request.body);
      const result = await exerciseService.createSystem(input);
      response.status(201).json(result);
    },

    update: async (request: Request<{ id: string }>, response: Response): Promise<void> => {
      const input = validateInput(updateExerciseRequestSchema, request.body);
      const result = await exerciseService.update(request.auth!.userId, request.params.id, input);
      response.status(200).json(result);
    },

    delete: async (request: Request<{ id: string }>, response: Response): Promise<void> => {
      await exerciseService.delete(request.auth!.userId, request.params.id);
      response.status(204).end();
    },
  };
}
