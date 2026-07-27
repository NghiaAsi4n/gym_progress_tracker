import { createContext, useContext } from "react";

import type { Locale, Namespace, TranslationKey } from "./resources.js";

export type TranslationFunction = <SelectedNamespace extends Namespace>(
  namespace: SelectedNamespace,
  key: TranslationKey<SelectedNamespace>,
) => string;

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationFunction;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return value;
}
