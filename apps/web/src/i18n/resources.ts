import enAuth from "./en/auth.json";
import enCommon from "./en/common.json";
import viAuth from "./vi/auth.json";
import viCommon from "./vi/common.json";

const viResources = {
  auth: viAuth,
  common: viCommon,
};

type ResourceSchema = {
  [Namespace in keyof typeof viResources]: Record<keyof (typeof viResources)[Namespace], string>;
};

const enResources = {
  auth: enAuth,
  common: enCommon,
} satisfies ResourceSchema;

export const resources = {
  en: enResources,
  vi: viResources,
};

export type Locale = keyof typeof resources;
export type Namespace = keyof typeof viResources;
export type TranslationKey<SelectedNamespace extends Namespace> = Extract<
  keyof (typeof viResources)[SelectedNamespace],
  string
>;

export function translate<SelectedNamespace extends Namespace>(
  locale: Locale,
  namespace: SelectedNamespace,
  key: TranslationKey<SelectedNamespace>,
): string {
  const localizedNamespace = resources[locale][namespace] as Record<string, string>;
  const fallbackNamespace = resources.vi[namespace] as Record<string, string>;

  return localizedNamespace[key] ?? fallbackNamespace[key] ?? viCommon.missingTranslation;
}
