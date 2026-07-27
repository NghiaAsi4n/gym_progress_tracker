import { Router } from "express";

import { createAuthController } from "./auth.controller.js";
import type { AuthService } from "./auth.service.js";
import type { RefreshService } from "./refresh.service.js";

export function createAuthRouter(
  authService: AuthService,
  refreshService: RefreshService,
  webOrigin: string,
) {
  const router = Router();
  const controller = createAuthController(authService, refreshService, webOrigin);

  router.post("/login", controller.login);
  router.post("/register", controller.register);
  router.post("/refresh", controller.refresh);
  router.post("/logout", controller.logout);

  return router;
}
