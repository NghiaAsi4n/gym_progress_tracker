import { loginRequestSchema, registerRequestSchema } from "@gym-tracking/contracts";
import type { Request, Response } from "express";

import { validateInput } from "../../shared/validate.js";
import type { AuthService } from "./auth.service.js";

export function createAuthController(authService: AuthService) {
  return {
    login: async (request: Request, response: Response): Promise<void> => {
      const input = validateInput(loginRequestSchema, request.body);
      response.status(200).json(await authService.login(input));
    },

    register: async (request: Request, response: Response): Promise<void> => {
      const input = validateInput(registerRequestSchema, request.body);
      response.status(201).json(await authService.register(input));
    },
  };
}
