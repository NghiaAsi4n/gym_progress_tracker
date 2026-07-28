import type { RouteObject } from "react-router-dom";

import { AuthPage } from "../features/auth/AuthPage.js";
import { ProtectedRoute } from "../features/auth/ProtectedRoute.js";
import { ExerciseCatalogPage } from "../features/planning/ExerciseCatalogPage.js";
import { WorkoutTemplatesPage } from "../features/planning/WorkoutTemplatesPage.js";
import { BodyWeightPage } from "../features/progress/BodyWeightPage.js";
import { ProgressDashboardPage } from "../features/progress/ProgressDashboardPage.js";
import { ActiveWorkoutPage } from "../features/workouts/ActiveWorkoutPage.js";
import {
  WorkoutDetailPage,
  WorkoutHistoryPage,
} from "../features/workouts/WorkoutHistoryPage.js";
import { HomePage } from "../features/home/HomePage.js";
import { NotFoundPage } from "../features/not-found/NotFoundPage.js";
import { AppShell } from "./AppShell.js";

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
        path: "workouts/active",
        element: (
          <ProtectedRoute>
            <ActiveWorkoutPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "workouts/history",
        element: (
          <ProtectedRoute>
            <WorkoutHistoryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "workouts/history/:id",
        element: (
          <ProtectedRoute>
            <WorkoutDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "progress",
        element: (
          <ProtectedRoute>
            <ProgressDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "progress/body-weight",
        element: (
          <ProtectedRoute>
            <BodyWeightPage />
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
