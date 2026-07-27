(() => {
  const storageKey = "gym-tracking.locale";
  const supportedLocales = new Set(["vi", "en"]);
  let storedLocale = null;

  try {
    storedLocale = globalThis.localStorage.getItem(storageKey);
  } catch {
    // Browser language and Vietnamese remain available when storage is blocked.
  }

  const browserLanguages =
    globalThis.navigator.languages.length > 0
      ? globalThis.navigator.languages
      : [globalThis.navigator.language];
  const browserLocale = browserLanguages
    .map((language) => language.toLowerCase().split("-")[0])
    .find((language) => supportedLocales.has(language));
  const locale = supportedLocales.has(storedLocale) ? storedLocale : (browserLocale ?? "vi");

  globalThis.document.documentElement.lang = locale;
})();
