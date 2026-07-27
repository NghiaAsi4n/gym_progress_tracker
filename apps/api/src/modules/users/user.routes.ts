import { Router, type RequestHandler } from "express";

import type { UserService } from "./user.service.js";

export function createUserRouter(authenticate: RequestHandler, userService: UserService) {
  const router = Router();

  router.get("/", authenticate, async (request, response) => {
    response.status(200).json(await userService.getMe(request.auth!.userId));
  });

  return router;
}
