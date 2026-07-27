import { useCallback, useMemo, useSyncExternalStore } from "react";

const DARK_THEME_QUERY = "(prefers-color-scheme: dark)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function useMediaQuery(query: string): boolean {
  const mediaQuery = useMemo(
    () => (typeof matchMedia === "function" ? matchMedia(query) : null),
    [query],
  );
  const subscribe = useCallback(
    (notify: () => void) => {
      mediaQuery?.addEventListener("change", notify);

      return () => {
        mediaQuery?.removeEventListener("change", notify);
      };
    },
    [mediaQuery],
  );
  const getSnapshot = useCallback(() => mediaQuery?.matches ?? false, [mediaQuery]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function usePrefersDarkTheme(): boolean {
  return useMediaQuery(DARK_THEME_QUERY);
}

export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}
