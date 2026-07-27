import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { I18nContext } from "./i18n-context.js";
import { readPreferredLocale, storeLocale } from "./locale-storage.js";
import { translate, type Locale, type Namespace, type TranslationKey } from "./resources.js";

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? readPreferredLocale());

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    storeLocale(nextLocale);
    setLocaleState(nextLocale);
  }, []);
  const t = useCallback(
    <SelectedNamespace extends Namespace>(
      namespace: SelectedNamespace,
      key: TranslationKey<SelectedNamespace>,
    ) => translate(locale, namespace, key),
    [locale],
  );
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext value={value}>{children}</I18nContext>;
}
