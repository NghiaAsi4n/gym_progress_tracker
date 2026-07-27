import { Router } from "express";

import { createAuthController } from "./auth.controller.js";
import type { AuthService } from "./auth.service.js";

export function createAuthRouter(authService: AuthService) {
  const router = Router();
  const controller = createAuthController(authService);

  router.post("/login", controller.login);
  router.post("/register", controller.register);

  return router;
}
