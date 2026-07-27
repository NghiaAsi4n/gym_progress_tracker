import {
  createWorkoutDraftRequestSchema,
  updateWorkoutDraftRequestSchema,
  workoutHistoryQuerySchema,
  workoutTransitionRequestSchema,
} from "@gym-tracking/contracts";
import { Router, type RequestHandler } from "express";

import { validateInput } from "../../shared/validate.js";
import type { WorkoutService } from "./workout.service.js";

export function createWorkoutRouter(authenticate: RequestHandler, service: WorkoutService) {
  const router = Router();
  router.use(authenticate);

  router.get("/draft", async (request, response) => {
    response.json(await service.getActive(request.auth!.userId));
  });
  router.post("/draft", async (request, response) => {
    const input = validateInput(createWorkoutDraftRequestSchema, request.body);
    response.status(201).json(await service.createDraft(request.auth!.userId, input));
  });
  router.get("/", async (request, response) => {
    const query = validateInput(workoutHistoryQuerySchema, request.query);
    response.json(await service.listHistory(request.auth!.userId, query));
  });
  router.get("/:id", async (request, response) => {
    response.json(await service.get(request.auth!.userId, request.params.id));
  });
  router.patch("/:id", async (request, response) => {
    const input = validateInput(updateWorkoutDraftRequestSchema, request.body);
    response.json(await service.updateDraft(request.auth!.userId, request.params.id, input));
  });
  router.post("/:id/complete", async (request, response) => {
    const input = validateInput(workoutTransitionRequestSchema, request.body);
    response.json(await service.complete(request.auth!.userId, request.params.id, input.version));
  });
  router.post("/:id/cancel", async (request, response) => {
    const input = validateInput(workoutTransitionRequestSchema, request.body);
    response.json(await service.cancel(request.auth!.userId, request.params.id, input.version));
  });

  return router;
}
