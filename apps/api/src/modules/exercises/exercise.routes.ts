import { Router, type RequestHandler } from "express";

import { createExerciseController } from "./exercise.controller.js";
import type { ExerciseService } from "./exercise.service.js";

export function createExerciseRouter(
  authenticate: RequestHandler,
  requireAdmin: RequestHandler,
  exerciseService: ExerciseService,
) {
  const router = Router();
  const controller = createExerciseController(exerciseService);

  router.get("/", authenticate, controller.list);
  router.post("/", authenticate, controller.create);
  router.post("/system", authenticate, requireAdmin, controller.createSystem);
  router.get("/:id", authenticate, controller.getById);
  router.patch("/:id", authenticate, controller.update);
  router.delete("/:id", authenticate, controller.delete);

  return router;
}
