import type { RouteObject } from "react-router-dom";

import { AuthPage } from "../features/auth/AuthPage.js";
import { ProtectedRoute } from "../features/auth/ProtectedRoute.js";
import { ExerciseCatalogPage } from "../features/planning/ExerciseCatalogPage.js";
import { TrainingPlannerPage } from "../features/planning/TrainingPlannerPage.js";
import { WorkoutTemplatesPage } from "../features/planning/WorkoutTemplatesPage.js";
import { AppShell, HomePage, NotFoundPage } from "./route-components.js";

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "auth/login",
        element: <AuthPage mode="login" />,
      },
      {
        path: "auth/register",
        element: <AuthPage mode="register" />,
      },
      {
        path: "exercises",
        element: (
          <ProtectedRoute>
            <ExerciseCatalogPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "templates",
        element: (
          <ProtectedRoute>
            <WorkoutTemplatesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "training-plans",
        element: (
          <ProtectedRoute>
            <TrainingPlannerPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
];
