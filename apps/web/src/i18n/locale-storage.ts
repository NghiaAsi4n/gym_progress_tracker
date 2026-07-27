import type { Locale } from "./resources.js";

export const LOCALE_STORAGE_KEY = "gym-tracking.locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "vi" || value === "en";
}

export function detectLocale(
  storedLocale: string | null,
  browserLanguages: readonly string[],
): Locale {
  if (isLocale(storedLocale)) {
    return storedLocale;
  }

  for (const browserLanguage of browserLanguages) {
    const language = browserLanguage.toLowerCase().split("-")[0];
    if (isLocale(language)) {
      return language;
    }
  }

  return "vi";
}

export function readPreferredLocale(): Locale {
  let storedLocale: string | null = null;

  try {
    storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    // Browser language and Vietnamese remain available when storage is blocked.
  }

  const browserLanguages =
    typeof navigator === "undefined"
      ? []
      : navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language];

  return detectLocale(storedLocale, browserLanguages);
}

export function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // The selected locale remains available for the current session.
  }
}
