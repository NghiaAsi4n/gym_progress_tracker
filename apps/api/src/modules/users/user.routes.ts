import { Router, type RequestHandler } from "express";
import { preferencesPatchRequestSchema } from "@gym-tracking/contracts";

import { validateInput } from "../../shared/validate.js";

import type { UserService } from "./user.service.js";

export function createUserRouter(authenticate: RequestHandler, userService: UserService) {
  const router = Router();

  router.get("/", authenticate, async (request, response) => {
    response.status(200).json(await userService.getMe(request.auth!.userId));
  });

  router.patch("/preferences", authenticate, async (request, response) => {
    const input = validateInput(preferencesPatchRequestSchema, request.body);
    response.status(200).json(await userService.updatePreferences(request.auth!.userId, input));
  });

  return router;
}
