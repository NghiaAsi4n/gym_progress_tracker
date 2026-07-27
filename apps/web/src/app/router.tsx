import type { RouteObject } from "react-router-dom";

import { AuthPage } from "../features/auth/AuthPage.js";
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
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
];
