import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ThemeProvider } from "../features/preferences/theme.js";
import { I18nProvider } from "../i18n/index.js";
import { AuthProvider } from "../features/auth/AuthProvider.js";
import { PreferencesProvider } from "../features/preferences/PreferencesProvider.js";
import { UnitProvider } from "../features/preferences/unit.js";

interface AppProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

export function AppProviders({ children, queryClient: providedClient }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      providedClient ??
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <AuthProvider>
      <ThemeProvider>
        <I18nProvider>
          <UnitProvider>
            <PreferencesProvider>
              <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            </PreferencesProvider>
          </UnitProvider>
        </I18nProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
