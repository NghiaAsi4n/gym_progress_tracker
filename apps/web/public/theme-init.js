(() => {
  const storageKey = "gym-tracking.theme";
  const allowedThemes = new Set(["light", "dark", "system"]);
  let preference = "system";

  try {
    const storedTheme = globalThis.localStorage.getItem(storageKey);
    if (storedTheme && allowedThemes.has(storedTheme)) {
      preference = storedTheme;
    }
  } catch {
    // The system preference remains the safe default when storage is blocked.
  }

  const resolvedTheme =
    preference === "system"
      ? globalThis.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;
  const root = globalThis.document.documentElement;

  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolvedTheme;
})();
